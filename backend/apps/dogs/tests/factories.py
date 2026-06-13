"""Dog factory, reused by the seed and by later parts that need dogs (PLAN 15-B2)."""

import factory

from apps.accounts.tests.factories import UserFactory
from apps.dogs.models import Dog


class DogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Dog

    owner = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Pies {n}")
    breed = "Mieszaniec"
    sex = Dog.Sex.MALE
