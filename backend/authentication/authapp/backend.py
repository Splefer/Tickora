"""
-------------------------------------------------------
registration and authentication
-------------------------------------------------------
"""
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.utils import timezone
from .models import Users, Roles, PerformerLinks, PerformerLinkRequests
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

"""
    -------------------------------------------------------
    Sends a verification email to complete the registeration
    Use: verification_email(user)
    -------------------------------------------------------
    Parameters:
        user - user object
    Returns:
        none
    ------------------------------------------------------
"""
def verification_email(user):
    subject = "Account Verification"
    message=f"""Hello {user.forename}, 

To continue setting up your Tickora account, please verify your account with the code below:
{user.verification_code}

Please do not disclose this code to others.
If you did not make this request, please disregard this email."""
    send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False)


"""
    -------------------------------------------------------
    Completes the registeration of the user.
    If there is any error, returns the errors
    If not, returns the user object
    Use: user = register(data)
    -------------------------------------------------------
    Parameters:
        data - input data from registration form - dict
    Returns:
        if no errors:
                    True
                    user - user object - Users
        otherwise 
                    False
                    errors - list
    ------------------------------------------------------
"""
def register(data):
    errors = validate_reg(data)
    if errors: return False, errors
    user = create_user(data)
    verification_email(user)
    return True, user


def get_user(email):
    try:
        return Users.objects.get(email=email)
    except Users.DoesNotExist:
        return None

"""
    -------------------------------------------------------
    Verifies the user using email and verification code.
    Use: done, message = verify(email, code)
    -------------------------------------------------------
    Parameters:
        email - user's email - str
        code - sent verification code - str
    Returns:
        done -  True if verification is done successfully
                    False otherwise
        message - status of verification
    ------------------------------------------------------
"""
def verify(email, code):
    user = get_user(email)
    if user is None:
        return False, "Email not found."
    if user.verified:
        return False, "Account is already verified."
    if user.verification_code != code:
        return False, "The code is incorrect."
    # account exists and code matches, verify the account
    user.verified = True
    user.verification_code = None
    user.save()
    return True, "Account successfully verified."

def authenticate_user(email, password):
    user = get_user(email)
    if user is None:
        return False, "Email not found."
    if not user.verified:
        return False, "Account is not verified."
    if not check_password(password, user.password_hash):
        return False, "The password is incorrect."
    return True, user


# temporary function to test if the email varification works:
# has NOT been tested in the second sprint as of July 4th
def test_send_email():
    role = Roles.objects.get(role_name="customer")
    user = Users(
        forename = "Test",
        surname = "User",
        email = "izadbakhsh.p16@gmail.com",
        password_hash = pass_hash("TestPassword!"),
        address = "Waterloo, ON",
        role = role,
        verified = False
    )
    user.verification_code=generate_code()
    verification_email(user)

    print("Email sent successfully.")

def is_manager(user):
    return user.role.role_name == "manager"

def is_performer(user):
    return user.role.role_name == "performer"

# returns None is no manager is linked to the performer
def get_manager(performer):
    link = (
        PerformerLinks.objects
        .select_related("manager")
        .filter(performer=performer)
        .first()
    )
    if link is None: return None

    return link.manager

"""
    -------------------------------------------------------
    Creates a manager request from the performer.
    Use: success, message = request_manager_link(performer, manager)
    -------------------------------------------------------
    Returns:
        success -  True if the two are linked successfully
                    False otherwise
        message - request on success
                    error message otherwise
    ------------------------------------------------------
"""
def request_manager_link(performer, manager):
    if not is_performer(performer):
        return False, "Only performers may request a manager."
    if not is_manager(manager):
        return False, "This user is not a manager."
    if PerformerLinks.objects.filter(
        performer=performer,manager=manager
    ).exists():
        return False, "You are already linked to this manager."
    if PerformerLinkRequests.objects.filter(
        performer=performer, manager=manager, status="pending"
    ).exists():
        return False, "A request has already been sent."
    
    request = PerformerLinkRequests.objects.create(
        performer=performer, manager=manager, status="pending"
    )

    return True, request


"""
    -------------------------------------------------------
    Returns every pending request for a manager in a list
    Use: pending_requests = get_pending_manager_requests(manager)
    ------------------------------------------------------
"""
def get_pending_manager_requests(manager):
    if not is_manager(manager):
        return []
    
    return PerformerLinkRequests.objects.select_related("performer").filter(
        manager=manager, status="pending"
    ).order_by("requested_at")

"""
    -------------------------------------------------------
    Approves the request from the manager's side
    Use: done, message = approve_manager_request(manager, request_id)
    -------------------------------------------------------
    Returns:
        done -  True if approved
                    False otherwise
        message - "Approved" if true
                    error message otherwise
    ------------------------------------------------------
"""
def approve_manager_request(manager, request_id):
    if not is_manager(manager):
        return False, "User is not a manager."

    try:
        request = PerformerLinkRequests.objects.get(
            request_id=request_id
        )
    except PerformerLinkRequests.DoesNotExist:
        return False, "Request not found."
    
    if request.manager != manager:
        return False, "This request does not belong to you."
    if request.status != "pending":
        return False, "This request has already been processed."
    
    # Creates a link between performer and manager and updates the request
    PerformerLinks.objects.create(performer=request.performer, manager=manager)
    request.status = "approved"
    request.responded_at = timezone.now()
    request.save()

    return True, "Approved"

"""
    -------------------------------------------------------
    Denies the request from the manager's side
    Use: done, message = deny_manager_request(manager, request_id)
    -------------------------------------------------------
    Returns:
        done -  True if denied
                    False otherwise
        message - "Denied" if true
                    error message otherwise
    ------------------------------------------------------
"""
def deny_manager_request(manager, request_id):
    if not is_manager(manager):
        return False, "User is not a manager."

    try:
        request = PerformerLinkRequests.objects.get(
            request_id=request_id
        )
    except PerformerLinkRequests.DoesNotExist:
        return False, "Request not found."

    if request.manager != manager:
        return False, "This request does not belong to you."
    if request.status != "pending":
        return False, "This request has already been processed."

    # Updates the request
    request.status = "denied"
    request.responded_at = timezone.now()
    request.save()

    return True, "Denied"