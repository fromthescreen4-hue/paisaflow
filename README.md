# Payza - Secure Financial Vault

Welcome to **Payza**, a modern, high-security Flutter Web application designed for private financial management. Payza provides a secure gateway to your financial tools with integrated onboarding, passcode protection, and a premium user experience.

## Core Features

- **Secure Iframe Integration**: Loads the Payza core engine seamlessly within a protected Flutter environment.
- **Passcode Protection**: Mandatory 4-digit passcode setup and verification for every session.
- **Modern Onboarding**: A 3-slide introduction to the app's features with smooth animations.
- **Responsive Web UI**: Built with Flutter Web, optimized for clean, minimal, and professional financial management.

## Technical Architecture

- **Framework**: Flutter Web
- **State Management**: Simple Clean Architecture
- **Storage**: `shared_preferences` for secure local state (passcode & first-launch logic)
- **UI/UX**: Google Fonts (Poppins), Smooth Page Indicators, and custom fintech-styled components.

## Getting Started

### 1. Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed and configured.
- Google Chrome (for development and testing).

### 2. Setup
If `flutter` is not in your terminal's PATH, you will need to add it or use the full path to the flutter executable.

```bash
# Install dependencies
flutter pub get

# Initialize web project (if web folder is missing)
flutter create . --platforms=web
```

### 3. Run the App
To run the app locally in Chrome:

```bash
flutter run -d chrome --web-renderer html
```

### 4. Build for Production
To build the app for hosting (e.g., GitHub Pages):

```bash
flutter build web --release --web-renderer html
```

---
> Professional Financial Sovereignty by Payza
