import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .backend import (
    register,
    verify,
    authenticate_user,
    login_user,
    logout_user,
    get_loggedin_user,
)


def get_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def user_to_dict(user):
    return {
        "id": getattr(user, "id", None),
        "user_id": getattr(user, "user_id", None),
        "forename": getattr(user, "forename", ""),
        "surname": getattr(user, "surname", ""),
        "email": getattr(user, "email", ""),
        "verified": getattr(user, "verified", False),
        "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
        "role": user.role.role_name if getattr(user, "role", None) else "",
    }


@csrf_exempt
def api_register_view(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    data = get_json_body(request)

    if data is None:
        return JsonResponse({"message": "Invalid JSON body"}, status=400)

    success, result = register(data)

    if not success:
        return JsonResponse({"errors": result}, status=400)

    user = result

    request.session["verify_email"] = user.email

    return JsonResponse(
        {
            "message": "Registration successful. Please verify your email.",
            "user": user_to_dict(user),
        },
        status=201,
    )


@csrf_exempt
def api_verify_view(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    data = get_json_body(request)

    if data is None:
        return JsonResponse({"message": "Invalid JSON body"}, status=400)

    email = data.get("email") or request.session.get("verify_email")
    code = data.get("verification_code") or data.get("code")

    success, message = verify(email, code)

    if not success:
        return JsonResponse({"message": message}, status=400)

    request.session.pop("verify_email", None)

    return JsonResponse({"message": message}, status=200)


@csrf_exempt
def api_login_view(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    data = get_json_body(request)

    if data is None:
        return JsonResponse({"message": "Invalid JSON body"}, status=400)

    email = data.get("email")
    password = data.get("password") or data.get("pass_field")

    success, result = authenticate_user(email, password)

    if not success:
        return JsonResponse({"message": result}, status=400)

    login_user(request, result)

    return JsonResponse(
        {
            "message": "Logged in successfully.",
            "user": user_to_dict(result),
        },
        status=200,
    )


@csrf_exempt
def api_logout_view(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    logout_user(request)

    return JsonResponse({"message": "Logged out successfully."}, status=200)


def api_current_user_view(request):
    user = get_loggedin_user(request)

    if user is None:
        return JsonResponse({"user": None}, status=401)

    return JsonResponse({"user": user_to_dict(user)}, status=200)