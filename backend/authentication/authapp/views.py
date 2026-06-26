from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages

# Create your views here.
from django.shortcuts import render, redirect
from django.contrib import messages

from .backend import (
    register,
    verify,
    authenticate_user,
    login_user,
    logout_user,
    get_loggedin_user,
)


def register_view(request):
    if request.method == "POST":
        success, result = register(request.POST)

        if success:
            request.session["verify_email"] = result.email
            messages.success(
                request,
                "Registration successful. Please check your email for the verification code."
            )
            return redirect("verify")

        for error in result:
            messages.error(request, error)

    return render(request, "authapp/register.html")


def verify_view(request):
    email = request.session.get("verify_email")

    if request.method == "POST":
        code = request.POST.get("verification_code")

        success, message = verify(email, code)

        if success:
            messages.success(request, message)
            request.session.pop("verify_email", None)
            return redirect("login")

        messages.error(request, message)

    return render(request, "authapp/verify.html", {"email": email})


def login_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        success, result = authenticate_user(email, password)

        if success:
            login_user(request, result)
            messages.success(request, "Logged in successfully.")
            return redirect("home")

        messages.error(request, result)

    return render(request, "authapp/login.html")


def logout_view(request):
    logout_user(request)
    messages.success(request, "Logged out successfully.")
    return redirect("login")


def home_view(request):
    user = get_loggedin_user(request)

    if user is None:
        return redirect("login")

    return render(request, "authapp/home.html", {"user": user})