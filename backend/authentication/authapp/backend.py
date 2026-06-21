"""
-------------------------------------------------------
registration and authentication
-------------------------------------------------------
Author:  Padmira Izadbakhsh
ID:      169108831
Email:   izad8831@mylaurier.ca
-------------------------------------------------------
"""

#import
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings
from .models import Users, Roles
import random

"""
    -------------------------------------------------------
    checks if an email is already registered in the database
    Use: exists = email_exists(email)
    -------------------------------------------------------
    Parameters:
        email - user's email
    Returns:
        exists - True iff the email exists, bool
    ------------------------------------------------------
"""
def email_exists(email):
    return Users.objects.filter(email=email).exists()


"""
    -------------------------------------------------------
    Hashes a password before saving it in the database
    Use: hashed_pass = pass_hash(password)
    -------------------------------------------------------
    Parameters:
        password - user's password - str
    Returns:
        hashed_pass - str
    ------------------------------------------------------
"""
def pass_hash(password):
    return make_password(password)

"""
    -------------------------------------------------------
    generates a random 6-digit code for email verification
    Use: code = generate_code()
    -------------------------------------------------------
    Parameters:
        none
    Returns:
        code - str
    ------------------------------------------------------
"""
def generate_code():
    return str(random.randint(100000, 999999))

"""
    -------------------------------------------------------
    Validates all registeration info and returns the errors
    Use: errors = validate_reg(data)
    -------------------------------------------------------
    Parameters:
        data - input data from registration form - dict
    Returns:
        errors - list
    ------------------------------------------------------
"""
def validate_reg(data):
    errors = []
    if not (data.get("forename")):
        errors.append("First name is required.")
    if not (data.get("surname")):
        errors.append("Last name is required.")
    if not (data.get("email")):
        errors.append("Email is required.")
    if not (data.get("role")):
        errors.append("Selecting a role is required.")
    if not (data.get("pass_field")):
        errors.append("Password is required.")
    if data.get("pass_field") and len(data["pass_field"])<8:
        errors.append("Password must have at least 8 characters.")
    if data.get("email") and email_exists(data["email"]):
        errors.append("Email is already registered.")
    return errors

"""
    -------------------------------------------------------
    Creates a new user account in the database
    Use: create_user(data)
    -------------------------------------------------------
    Parameters:
        data - input data from registration form - dict
    Returns:
        user - user object - Users
    ------------------------------------------------------
"""
def create_user(data):
    try:
        selected_role = Roles.objects.get(role_name=data["role"])
    except Roles.DoesNotExist:
        return None
    
    user = Users.objects.create(
        forename=data["forename"],
        surname=data["surname"],
        email=data["email"],
        pass_field=pass_hash(data["pass_field"]),
        verified = False,
        verification_code=generate_code(),
        address=data.get("address"),
        role=selected_role
    )

    return user

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

"""
    -------------------------------------------------------
    Get user by email
    Use: user = get_user(email)
    -------------------------------------------------------
    Parameters:
        email - str
    Returns:
        user - the user registered with the given email - Users object
    ------------------------------------------------------
"""
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

"""
    -------------------------------------------------------
    Authenticates a user by checking if the input is correct
    and the account has been verified
    Use: done, message = authenticate_user(email, password)
    -------------------------------------------------------
    Parameters:
        email - user's email - str
        password - user's password - str
    Returns:
        done -  True if Authentication is done successfully
                False otherwise
        if done is True: message - user object - Users
                is False: status of Authentication - str
    ------------------------------------------------------
"""
def authenticate_user(email, password):
    user = get_user(email)
    if user is None:
        return False, "Email not found."
    if not user.verified:
        return False, "Account is not verified."
    if not check_password(password, user.pass_field):
        return False, "The password is incorrect."
    # account exists and password matches:
    return True, user

"""
    -------------------------------------------------------
    Creates a session for an authenticated user.
    Use: login(request, user)
    -------------------------------------------------------
    Parameters:
        request - current HTTP request - HttpRequest
        user - authenticated user object - Users
    Returns:
        none
    ------------------------------------------------------
"""
def login_user(request, user):
    request.session["user_id"] = user.user_id
    request.session["role_id"] = user.role.role_id

"""
    -------------------------------------------------------
    Getter for an authenticated logged-in user.
    Use: user = get_loggedin_user(request)
    -------------------------------------------------------
    Parameters:
        request - current HTTP request - HttpRequest
    Returns:
        user - authenticated user object - Users
    ------------------------------------------------------
"""
def get_loggedin_user(request):
    user_id = request.session.get("user_id")
    if user_id is None: return None

    try:
        return Users.objects.get(user_id=user_id)
    except Users.DoesNotExist:
        return None
    
"""
    -------------------------------------------------------
    Logs out the user and clears the session data.
    Use: logout(request)
    -------------------------------------------------------
    Parameters:
        request - current HTTP request - HttpRequest
    Returns:
        none
    ------------------------------------------------------
"""
def logout_user(request):
    request.session.flush()

# temporary function to test if the email varification works:
def test_send_email():
    role = Roles.objects.get(role_name="customer")
    user = Users(
        forename = "Test",
        surname = "X",
        email = "izadbakhsh.p16@gmail.com",
        pass_field = pass_hash("TestPassword!"),
        address = "Waterloo, ON",
        role = role,
        verified = False
    )
    user.verification_code=generate_code()
    verification_email(user)

    print("Email sent successfully.")