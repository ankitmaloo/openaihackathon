from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Literal, Any, Dict, List

from agents import Agent, ItemHelpers, Runner, TResponseInputItem, trace
from firebase import save_chat
from progress import mark_first_turn_persisted
from openai import OpenAI
import os
from dotenv import load_dotenv
import urllib.request
import json as _json
load_dotenv()

OPENAIAPIKEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key = OPENAIAPIKEY)

PROCUREMENT_AGENT = """
You are Ava, the AI procurement agent for GreenLoop Inc.
Your mission: find, evaluate, and secure software or services that let GreenLoop stay compliant, scale faster, and stay under budget—while freeing Maya (VP Ops) for higher-order decisions.
Hard rules
Budget guardrails: never exceed the figure Maya gives you without explicit human override.
Security baseline: SOC-2 Type II (or ISO 27001) minimum; GDPR and CCPA compliance required; all sub-processors must be listed.
Procurement playbook: follow GreenLoop’s 7-step sourcing flow (needs spec → market scan → initial outreach → security review → redlines → signature → onboarding).
Tone: concise, data-driven, friendly but firm; use bullet summaries and risk tags.
Tool access: Slack, NetSuite, DocuSign, calendar, Google Drive (NDA templates, MSA redlines).
Ethics: disclose any conflict of interest; surface sustainability impact if >2 % of annual emissions.


GreenLoop (the buyer company)
What they do: A 120-person Series-B SaaS that helps e-commerce brands measure, offset, and display real-time carbon footprints of every shipped package.
Their Shopify plug-in shows shoppers a “Ship it green” toggle; when selected, GreenLoop calculates the extra cents needed to fund verified offset projects
and adds the charge at checkout. They process 20 M shipments a month across 3,000 merchants and must surface audited CO₂ numbers to both consumers
and regulators.

You are given a goal and you are directly talking to the vendor. Address the vendor, ask the right questions and then finally report back with details after agreeing on the next steps.
Goal: {agent_goal} Dont ask clarifying questions. Directly talk to the vendor, and figure out the details. Negotiate hard on pricing and secure some discounts. You have to take this to payment as final status. Say Maya will pay if you agree on the deal. Ask vendor to send the agreement + details on an official email. You have to figure out pricing, deployment schedule, and other software related details. Demo post everything just before payment. Haggle.
"""

SELLER_AGENT = """
DataSprout (the seller company). 
What they do: A 14-person seed-stage dev-tool company that exposes a single REST/GraphQL API. Developers send shipment metadata (origin, destination, weight, mode) and instantly get back kilograms of CO₂e, offset price, and a list of verified projects with per-ton costs. Includes a Snowflake native app so analysts can join emissions data with revenue tables. SOC-2 Type II certified; carbon factors updated monthly from EXIOBASE & DEFRA.

You are River, the AI sales rep for DataSprout.
Your mission: turn every qualified inbound or outbound lead into a signed annual or multi-year contract at the highest allowable ACV—while keeping Diego (Founder) focused on product.
Hard rules
Pricing guardrails: list price $22k/year for 2 M calls/mo; can discount up to 25 % on 24-month terms, 15 % on 12-month, but must flag any discount >10 % for Diego’s approval.
Security: always affirm SOC-2, GDPR, CCPA, and EU data residency in Frankfurt; attach pen-test summary automatically.
Sales playbook:
a. Qualify (BANT + technical fit)
b. Live demo link (calendly)
c. Security review package
d. Order-form redlines (MSA v4.2)
e. DocuSign → Stripe checkout → onboarding email
Tone: consultative, transparent, slightly nerdy; sprinkle emojis only if prospect does first.
Tool access: HubSpot, Slack, calendar, DocuSign, Stripe, Notion (roadmap), Gong transcripts.
Ethics: never oversell rate limits; surface any known latency caveats proactively.
You are talking in a back and forth with procurment team. Answer what is asked, and drive the conversation towards agreeing to next steps.
"""

def initialize_procurement(goal):
    # Agent 1: The procurement
    prompt = PROCUREMENT_AGENT.format(agent_goal = goal)
    procurement = Agent(
        name="Procurement agent",
        instructions=prompt,
    )

    return procurement

def initialize_vendor():
    # Agent 2: The vendor
    vendor = Agent(
        name="vendor_agent",
        instructions=SELLER_AGENT,
    )
    return vendor

@dataclass
class ConversationAnalysis:
    """Data structure for the analyzer's output."""
    is_over: bool
    reason: str   

def initialize_analyzer():
    conversation_analyzer = Agent[None](
    name="conversation_analyzer",
    instructions=(
        "You are a conversation analyzer. Your task is to determine if a conversation has reached a natural conclusion. The conversation is over if the procurer and vendor agree on next steps or repeating questions. The conversation is NOT over if they are still asking new question. "
        "The conversation should typically last for at least 4 exchanges. Final outcome is pricing agreement, not demo."
    ),
    output_type=ConversationAnalysis,
    )
    return conversation_analyzer

async def run_proc(query, conversation_id: str) -> None:

    # History used for model interactions
    conversation_history: list[TResponseInputItem] = [
        {"content": query, "role": "system"}
    ]
    # History persisted to Firestore, augmented with `source`
    persist_history: List[Dict[str, Any]] = list(conversation_history)
    print("requirement:", query)

    # Persist the initial state (no source for system entry)
    save_chat(conversation_id, persist_history, metadata={"status": "running"})

    proc = initialize_procurement(query)
    vend = initialize_vendor()
    analyzer = initialize_analyzer()

    # We'll run the entire conversation in a single trace
    turn_count = 0
    while turn_count < 10:  # Safety break to prevent infinite loops
        procurement_result = await Runner.run(
            proc,
            conversation_history,
        )
        procurement_message = ItemHelpers.text_message_outputs(procurement_result.new_items)
        print(f"\nProcurement: {procurement_message}")

        # Update model history with the latest items
        prev_len = len(conversation_history)
        conversation_history = procurement_result.to_input_list()
        # Capture only new items from this turn and tag source
        new_items = conversation_history[prev_len:]
        for it in new_items:
            # Copy and add source without mutating model history
            persist_item = dict(it)
            persist_item["source"] = "Ava"
            persist_history.append(persist_item)

        # Persist after procurement agent turn
        save_chat(conversation_id, persist_history)
        # Signal that the first meaningful turn is available
        if turn_count == 0:
            mark_first_turn_persisted(conversation_id)

        # Vendor's turn to speak
        vendor_result = await Runner.run(
            vend,
            conversation_history,
        )
        vendor_message = ItemHelpers.text_message_outputs(vendor_result.new_items)
        print(f"\nVendor: {vendor_message}")

        # Update model history and persist tagged vendor items
        prev_len = len(conversation_history)
        conversation_history = vendor_result.to_input_list()
        new_items = conversation_history[prev_len:]
        for it in new_items:
            persist_item = dict(it)
            persist_item["source"] = "River"
            persist_history.append(persist_item)

        # Persist after vendor agent turn
        save_chat(conversation_id, persist_history)

        # Analyzer's turn to evaluate
        # No state change needed here, just analysis
        print("len convo history", len(conversation_history))
        analyzer_result = await Runner.run(analyzer, conversation_history)
        analysis: ConversationAnalysis = analyzer_result.final_output

        if analysis.is_over and turn_count > 3:
            print(f"\n--- Conversation Over: {analysis.reason} ---")
            # Mark conversation complete
            save_chat(
                conversation_id,
                persist_history,
                metadata={
                    "status": "completed",
                    "reason": analysis.reason,
                    "final_message": "Done",
                },
            )
            break

        turn_count += 1

    print("\n--- Final Conversation History ---")
    for item in conversation_history:
        # This simple printout doesn't distinguish roles, but shows the full log
        print(f"- {item['content']}")

    # Ensure final snapshot is persisted even if loop exits via turn limit

    final_resp = get_ai_resp(conversation_history)
    print("final response to user", final_resp)
    save_chat(
        conversation_id,
        persist_history,
        metadata={
            "status": "completed",
            "final_message": "Done",
        },
    )

    # Build full conversation text and send to local workflow endpoint
    def _extract_text(content: Any) -> str:
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: List[str] = []
            for part in content:
                if isinstance(part, str):
                    parts.append(part)
                elif isinstance(part, dict):
                    t = part.get("text") or part.get("content")
                    if isinstance(t, str):
                        parts.append(t)
            return "\n".join([p for p in parts if p])
        if isinstance(content, dict):
            t = content.get("text") or content.get("content")
            if isinstance(t, str):
                return t
        try:
            return str(content)
        except Exception:
            return ""

    lines: List[str] = []
    for item in persist_history:
        source = item.get("source") or item.get("role") or "system"
        text = _extract_text(item.get("content"))
        if not text:
            continue
        lines.append(f"{source}: {text}")

    convo_text = "\n\n".join(lines)

    def _post_workflow(text: str) -> None:
        try:
            payload = _json.dumps({"conversation": text}).encode("utf-8")
            req = urllib.request.Request(
                "http://localhost:3000/workflow",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as _resp:
                _resp.read()
        except Exception as e:
            print("[workflow] post failed:", e)

    try:
        await asyncio.to_thread(_post_workflow, convo_text)
    except Exception as e:
        print("[workflow] scheduling failed:", e)


def get_ai_resp(conversation_history, stream=False, pr_id=None):
  out = client.responses.create(
  model="gpt-5",
    input=conversation_history,
    instructions="Based on this conversation, you have to send a one line message to Maya about next steps. Just give me the message starting with: Hi Maya,",
    previous_response_id=pr_id,
    stream=stream,
    #store=False
  )
  return out.output_text

def stream_assistant_response(query = None, prev_resp_id = None):
    
    ai_r = get_ai_resp(query, stream=True, pr_id=prev_resp_id)
    
    resp_id = ""
    final_tool_calls = {}
    
    for event in ai_r:
        event_type = event.type
        if event_type == "response.created":
        # Print the response id for production logging.
            response = getattr(event, "response", {})
            resp_id = getattr(response,"id", "unknown")
            yield f"__PRID:{resp_id}_PRID__" #changing threadid to resp id to accommodate response api
            # Continue to next event; do not yield anything to UI.
            continue

        if event_type == "response.output_item.added":
            # Extract the item from the event
            item = event.item
            # Compare the inner item's type
            if hasattr(item, "type") and item.type == "function_call":
                final_tool_calls[event.output_index] = item
            else:
                # Process non-function_call items if needed
                print("Received non-function_call item:", item)
            continue    

        if (event_type == "response.output_text.delta"):
            text_delta = getattr(event, "delta", "")
            yield text_delta
            continue

        if (event_type == "response.completed"): 
            break

        # Process additional function call argument delta events
        if event_type == "response.function_call_arguments.delta":
            index = event.output_index
            if index in final_tool_calls:
                final_tool_calls[index].arguments += event.delta

        if event_type == "error":
            error_message = f"Error: {getattr(event, 'message', 'Unknown error')}"
            error_code = getattr(event, 'code', 'Unknown code')
            yield f"__ERROR:{error_code}__ {error_message}"
            continue
