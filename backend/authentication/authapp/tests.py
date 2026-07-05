from django.test import TestCase, RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.core import mail
from unittest.mock import patch

from .models import Users, Roles, PerformerLinks, PerformerLinkRequests
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
    request_manager_link,
    get_pending_manager_requests,
    approve_manager_request,
    deny_manager_request,
)
# Create your tests here.

class Authentication_tests(TestCase):
    def setUp(self):
        self.role = Roles.objects.get(role_name="customer")
        self.user = Users.objects.create(
            forename = "first",
            surname = "user",
            email = "test@mylaurier.ca",
            password_hash = pass_hash("TestPassword!"),
            address = "Waterloo, ON",
            role = self.role,
            verified = True
            )
        
        self.manager_role = Roles.objects.get(role_name="manager")
        self.manager = Users.objects.create(
            forename="manager",
            surname="user",
            email="manager@mylaurier.ca",
            password_hash=pass_hash("ManagerUser!"),
            role=self.manager_role,
            verified=True
        )

        self.performer_role = Roles.objects.get(role_name="performer")
        self.performer = Users.objects.create(
            forename="performer",
            surname="user",
            email="performer@mylaurier.ca",
            password_hash=pass_hash("PerformerUser!"),
            role=self.performer_role,
            verified=True
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
            "password_hash": "pass1234@",
            "role": "customer",
            "address": "65 University Ave W, Waterloo, ON"
        }
        user = create_user(sample_data)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "izadbakhsh.p16@gmail.com")
        self.assertNotEqual(user.password_hash, "pass1234@")
        self.assertFalse(user.verified)
        
    def test_register(self):
        sample_data = {
            "forename": "Padmira",
            "surname": "Izadbakhsh",
            "email": "izadbakhsh.p16@gmail.com",
            "password_hash": "pass1234@",
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
            password_hash = pass_hash("TestPassword2"),
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
            password_hash = pass_hash("ThirdTestPassword!"),
            role = self.role,
            verified = True
            )
        done, message = authenticate_user("auth@mylaurier.ca", "ThirdTestPassword!")
        self.assertTrue(done)
        self.assertIsNotNone(user)
    
    def test_request_manager_link(self):
        success, request = request_manager_link(self.performer, self.manager)
        self.assertTrue(success)
        self.assertEqual(request.status, "pending")
        self.assertTrue(PerformerLinkRequests.objects.filter(performer=self.performer, manager=self.manager
            ).exists())
        
    def test_request_manager_link_twice(self):
        request_manager_link(self.performer, self.manager)
        success, message = request_manager_link(self.performer, self.manager)
        self.assertFalse(success)
        self.assertEqual(message, "A request has already been sent.")

    def test_get_pending_manager_requests(self):
        request_manager_link(self.performer, self.manager)
        requests = get_pending_manager_requests(self.manager)
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].performer.email,"performer@mylaurier.ca")

    def test_approve_manager_request(self):
        success, request = request_manager_link(self.performer, self.manager)
        done, message = approve_manager_request(self.manager, request.request_id)
        self.assertTrue(done)
        self.assertEqual(message, "Approved")
        self.assertTrue(PerformerLinks.objects.filter(performer=self.performer, manager=self.manager
            ).exists())
        request.refresh_from_db()
        self.assertEqual(request.status, "approved")

    def test_deny_manager_request(self):
        success, request = request_manager_link(self.performer, self.manager)
        done, message = deny_manager_request(self.manager,request.request_id)
        self.assertTrue(done)
        self.assertEqual(message, "Denied")
        request.refresh_from_db()
        self.assertEqual(request.status, "denied")
        self.assertFalse(PerformerLinks.objects.filter(performer=self.performer,manager=self.manager
            ).exists())
        
    def test_approve_invalid_request(self):
        done, message = approve_manager_request(self.manager, 2026)
        self.assertFalse(done)
        self.assertEqual(message, "Request not found.")

    def test_deny_invalid_request(self):
        done, message = deny_manager_request(self.manager, 2026)
        self.assertFalse(done)
        self.assertEqual(message, "Request not found.")

    def test_non_manager_cannot_approve(self):
        success, request = request_manager_link(self.performer, self.manager)
        done, message = approve_manager_request(self.performer, request.request_id)
        self.assertFalse(done)
        self.assertEqual(message, "User is not a manager.")