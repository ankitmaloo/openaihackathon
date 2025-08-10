from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

from constants import *

# Initialize Firebase Admin app and Firestore client
_cred = credentials.Certificate(FIREBASE_ADMIN_CREDS)
if not firebase_admin._apps:  # Avoid double initialization in hot-reload scenarios
    firebase_admin.initialize_app(_cred)
db = firestore.client()


def create_conversation(metadata: Optional[Dict[str, Any]] = None) -> str:
    """Create a root conversation document with an auto-generated ID and return it."""
    doc_ref = db.collection("a2a").document()  # auto-generated ID
    conversation_id = doc_ref.id
    base_data: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "created": firestore.SERVER_TIMESTAMP,
        "updated": firestore.SERVER_TIMESTAMP,
    }
    if metadata:
        base_data.update(metadata)
    doc_ref.set(base_data, merge=True)
    return conversation_id


def save_chat(
    conversation_id: str,
    conversation_history: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Persist the conversation in Firestore under collection `a2a`:
    - Root document ID is `conversation_id` with metadata and updated timestamp
    - Subcollection `history` contains a single doc with ID equal to
      `conversation_id` that is updated every turn with the entire
      `conversation_history`

    Returns the `conversation_id` used.
    """

    # Root conversation document
    doc_ref = db.collection("a2a").document(conversation_id)
    base_data: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "updated": firestore.SERVER_TIMESTAMP,
    }
    if metadata:
        base_data.update(metadata)

    # Merge so we only update changed fields and timestamp
    doc_ref.set(base_data, merge=True)

    # Subcollection document that we keep updating
    history_doc = doc_ref.collection("history").document(conversation_id)
    history_doc.set(
        {
            "conversation_history": conversation_history,
            "turn_count": len(conversation_history),
            "updated": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    return conversation_id
