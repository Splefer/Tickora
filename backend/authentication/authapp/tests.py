from django.test import TestCase, RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.core import mail
from unittest.mock import patch

from .models import Users, Roles
from .backend import (
    email_exists,
    pass_hash,
    generate_code,
    validate_reg,
    create_user,
    register,
    get_user,
    verify,
    authenticate_user,
    login_user,
    get_loggedin_user,
    logout_user
)
# Create your tests here.

class Authentication_tests(TestCase):
    def setUp(self):
        self.role = Roles.objects.create(role_name="customer")
        self.user = Users.objects.create(
            forename = "first",
            surname = "user",
            email = "test@mylaurier.ca",
            pass_field = pass_hash("TestPassword!"),
            address = "Waterloo, ON",
            role = self.role,
            verified = True
            )
        
    def test_email_exists(self):
        self.assertTrue(email_exists("test@mylaurier.ca"))
        self.assertFalse(email_exists("random@mylaurier.ca"))

    def test_pass_hash(self):
        hashed_pass = pass_hash("aRandomPass1")
        self.assertNotEqual(hashed_pass,"aRandomPass1")

    #tests the case that required fields are missing
    def test_validate_reg(self):
        data = {"surname": "test"}
        errors = validate_reg(data)
        self.assertIn("First name is required.", errors)
        self.assertNotIn("Last name is required.", errors)
        self.assertIn("Email is required.", errors)

    def test_create_user(self):         
        sample_data = {
            "forename": "Padmira",
            "surname": "Izadbakhsh",
            "email": "izadbakhsh.p16@gmail.com",
            "pass_field": "pass1234@",
            "role": "customer",
            "address": "65 University Ave W, Waterloo, ON"
        }
        user = create_user(sample_data)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "izadbakhsh.p16@gmail.com")
        self.assertNotEqual(user.pass_field, "pass1234@")
        self.assertFalse(user.verified)
        
    def test_register(self):
        sample_data = {
            "forename": "Padmira",
            "surname": "Izadbakhsh",
            "email": "izadbakhsh.p16@gmail.com",
            "pass_field": "pass1234@",
            "role": "customer",
            "address": "65 University Ave W, Waterloo, ON"
        }
        done, user = register(sample_data)
        self.assertTrue(done)
        self.assertEqual(user.email, "izadbakhsh.p16@gmail.com")

    def test_verify(self):
        user = Users.objects.create(
            forename = "second",
            surname = "user",
            email = "verify@mylaurier.ca",
            pass_field = pass_hash("TestPassword2"),
            role = self.role,
            verified = False,
            verification_code = "012345"
            )
        done, message = verify("verify@mylaurier.ca", "012345")
        self.assertTrue(done)
        self.assertEqual(message, "Account successfully verified.")

    def test_authenticate(self):
        user = Users.objects.create(
            forename = "third",
            surname = "user",
            email = "auth@mylaurier.ca",
            pass_field = pass_hash("ThirdTestPassword!"),
            role = self.role,
            verified = True
            )
        done, message = authenticate_user("auth@mylaurier.ca", "ThirdTestPassword!")
        self.assertTrue(done)
        self.assertIsNotNone(user)