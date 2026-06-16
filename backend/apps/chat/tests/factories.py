"""Chat factories (PLAN 15-B8).

The conversation's ``client`` defaults to a client-role user and its garden to an approved
listing (so ``get_or_create_conversation`` would accept it). Message tests pass a ``sender``
that is one of the two participants explicitly; the bare factory default is fine for rows that
only need to exist.
"""

import factory

from apps.accounts.tests.factories import UserFactory
from apps.chat.models import ChatMessage, Conversation
from apps.gardens.tests.factories import GardenFactory


class ConversationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Conversation

    garden = factory.SubFactory(GardenFactory)
    client = factory.SubFactory(UserFactory)


class ChatMessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ChatMessage

    conversation = factory.SubFactory(ConversationFactory)
    sender = factory.SubFactory(UserFactory)
    content = factory.Sequence(lambda n: f"Wiadomość testowa #{n}")
