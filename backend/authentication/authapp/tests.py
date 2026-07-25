from django.test import TestCase, RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.core import mail
from unittest.mock import patch
from django.contrib.auth.hashers import check_password

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
    update_email,
    change_password,
    invalid_name,
    update_forename,
    update_surname,
    update_address
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

    def test_update_email(self):
        done, message = update_email(self.user, "TestPassword!", "newEmail@mylaurier.ca")
        self.assertTrue(done)
        self.assertEqual(message, "Email updated.")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "newEmail@mylaurier.ca")

    def test_update_email_wrong_password(self):
        done, message = update_email(self.user, "WrongPassword!", "newEmail@mylaurier.ca")
        self.assertFalse(done)
        self.assertEqual(message, "Incorrect password.")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "test@mylaurier.ca")

    def test_update_email_existing_email(self):
        done, message = update_email(self.user, "TestPassword!", "manager@mylaurier.ca")
        self.assertFalse(done)
        self.assertEqual(message, "Email is already registered.")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "test@mylaurier.ca")

    def test_change_password(self):
        done, message = change_password(self.user, "TestPassword!", "NewPassword!")
        self.assertTrue(done)
        self.assertEqual(message, "Password updated.")

        self.user.refresh_from_db()
        self.assertTrue(check_password("NewPassword!", self.user.password_hash))

    def test_change_password_wrong_password(self):
        done, message = change_password(self.user, "WrongPassword!", "NewPassword!")
        self.assertFalse(done)
        self.assertEqual(message, "Incorrect password.")

        self.user.refresh_from_db()
        self.assertTrue(check_password("TestPassword!", self.user.password_hash))

    def test_change_password_same_password(self):
        done, message = change_password(self.user, "TestPassword!", "TestPassword!")
        self.assertFalse(done)
        self.assertEqual(message, "Enter a new password.")

    def test_change_password_short_password(self):
        done, message = change_password(self.user, "TestPassword!", "short")
        self.assertFalse(done)
        self.assertEqual(message, "Password must have at least 8 characters.")

    def test_invalid_name(self):
        self.assertFalse(invalid_name("Test"))
        self.assertFalse(invalid_name("  Test   "))
        self.assertFalse(invalid_name("Test-User"))
        self.assertTrue(invalid_name("Test1"))
        self.assertTrue(invalid_name("Test@"))
    
    def test_update_forename(self):
        done, updated_user = update_forename(self.user, "UpdatedName")
        self.assertTrue(done)
        self.assertEqual(updated_user.forename, "UpdatedName")

        self.user.refresh_from_db()
        self.assertEqual(self.user.forename, "UpdatedName")

    def test_update_forename_empty(self):
        done, message = update_forename(self.user, "")
        self.assertFalse(done)
        self.assertEqual(message, "First name is required.")

    def test_update_forename_invalid(self):
        done, message = update_forename(self.user, "Test1")
        self.assertFalse(done)
        self.assertEqual(message, "First name is invalid.")    

    def test_update_surname(self):
        done, updated_user = update_surname(self.user, "UpdatedName")
        self.assertTrue(done)
        self.assertEqual(updated_user.surname, "UpdatedName")

        self.user.refresh_from_db()
        self.assertEqual(self.user.surname, "UpdatedName")

    def test_update_surname_empty(self):
        done, message = update_surname(self.user, "")
        self.assertFalse(done)
        self.assertEqual(message, "Last name is required.")

    def test_update_surname_invalid(self):
        done, message = update_surname(self.user, "Test1")
        self.assertFalse(done)
        self.assertEqual(message, "Last name is invalid.")

    def test_update_address(self):
        done, updated_user = update_address(self.user, "1 New St, Waterloo, ON")
        self.assertTrue(done)
        self.assertEqual(updated_user.address, "1 New St, Waterloo, ON")

        self.user.refresh_from_db()
        self.assertEqual(self.user.address, "1 New St, Waterloo, ON")

    def test_update_address_empty(self):
        done, message = update_address(self.user, "")
        self.assertFalse(done)
        self.assertEqual(message, "Address is required.")

        
    
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

    def test_request_manager_invalid_manager(self):
        another_performer = Users.objects.create(
            forename="another",
            surname="performer",
            email="performer2@mylaurier.ca",
            password_hash=pass_hash("anotherPerformer!"),
            role=self.performer_role,
            verified=True
        )
        success, message = request_manager_link(self.performer, another_performer)
        self.assertFalse(success)
        self.assertEqual(message, "This user is not a manager.")

    def test_manager_cannot_request_manager(self):
        another_manager = Users.objects.create(
            forename="another",
            surname="manager",
            email="manager2@mylaurier.ca",
            password_hash=pass_hash("anotherManager!"),
            role=self.manager_role,
            verified=True
        )
        success, message = request_manager_link(self.manager, another_manager)
        self.assertFalse(success)
        self.assertEqual(message, "Only performers may request a manager.")

    def test_approve_other_managers_request(self):
        other_manager = Users.objects.create(
            forename="other",
            surname="manager",
            email="othermanager@mylaurier.ca",
            password_hash=pass_hash("OtherManager!"),
            role=self.manager_role,
            verified=True
        )
        success, request = request_manager_link(self.performer,self.manager)
        done, message = approve_manager_request(other_manager, request.request_id)
        self.assertFalse(done)
        self.assertEqual(message,"This request does not belong to you.")

    def test_cannot_approve_processed_request(self):
        success, request = request_manager_link(self.performer,self.manager)
        approve_manager_request(self.manager, request.request_id)
        done, message = approve_manager_request(self.manager, request.request_id)
        self.assertFalse(done)
        self.assertEqual(message,"This request has already been processed.")
