"""
-------------------------------------------------------
registration and authentication
-------------------------------------------------------
Author:  Padmira Izadbakhsh
ID:      169108831
Email:   izad8831@mylaurier.ca
-------------------------------------------------------
"""

from django.contrib.auth.hashers import make_password, check_password
from .models import Users, Roles
import random


def email_exists(email):
    return Users.objects.filter(email=email).exists()


def pass_hash(password):
    return make_password(password)


def generate_code():
    return str(random.randint(100000, 999999))


def validate_reg(data):
    errors = []
    if not data.get("forename"):
        errors.append("First name is required.")
    if not data.get("surname"):
        errors.append("Last name is required.")
    if not data.get("email"):
        errors.append("Email is required.")
    if not data.get("role"):
        errors.append("Selecting a role is required.")
    if not data.get("password_hash"):
        errors.append("Password is required.")
    if data.get("password_hash") and len(data["password_hash"]) < 8:
        errors.append("Password must have at least 8 characters.")
    if data.get("email") and email_exists(data["email"]):
        errors.append("Email is already registered.")
    return errors


def create_user(data):
    try:
        selected_role = Roles.objects.get(role_name=data["role"])
    except Roles.DoesNotExist:
        return None

    return Users.objects.create(
        forename=data["forename"],
        surname=data["surname"],
        email=data["email"],
        password_hash=pass_hash(data["password_hash"]),
        verified=False,
        verification_code=generate_code(),
        address=data.get("address"),
        role=selected_role,
    )


def get_user(email):
    try:
        return Users.objects.get(email=email)
    except Users.DoesNotExist:
        return None


def authenticate_user(email, password):
    user = get_user(email)
    if user is None:
        return False, "Email not found."
    if not user.verified:
        return False, "Account is not verified."
    if not check_password(password, user.password_hash):
        return False, "The password is incorrect."
    return True, user
