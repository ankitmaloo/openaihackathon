import asyncio
from typing import Dict

_events: Dict[str, asyncio.Event] = {}


def _get_event(conversation_id: str) -> asyncio.Event:
    ev = _events.get(conversation_id)
    if ev is None:
        ev = asyncio.Event()
        _events[conversation_id] = ev
    return ev


def mark_first_turn_persisted(conversation_id: str) -> None:
    """Signal that the first meaningful turn has been persisted."""
    _get_event(conversation_id).set()


async def wait_first_turn(conversation_id: str, timeout: float | None = None) -> bool:
    """Wait until the first turn is marked; returns True if set, False on timeout."""
    ev = _get_event(conversation_id)
    try:
        await asyncio.wait_for(ev.wait(), timeout=timeout)
        return True
    except asyncio.TimeoutError:
        return False


def is_first_turn_persisted(conversation_id: str) -> bool:
    return _get_event(conversation_id).is_set()

