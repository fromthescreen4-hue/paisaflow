import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/storage_service.dart';
import 'onboarding.dart';
import 'verify_passcode.dart';
import 'force_update_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    _checkAppStatus();
  }

  Future<void> _checkAppStatus() async {
    // Check for Force Update
    try {
      // MOCK VERSION CHECK - Point this to a JSON on your GitHub Pages
      // final response = await http.get(Uri.parse('https://your-github.io/config.json'));
      // final config = json.decode(response.body);
      bool forceUpdate = false; // logic: config['min_version'] > current_version

      if (forceUpdate) {
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ForceUpdateScreen(updateUrl: 'https://github.com/')),
        );
        return;
      }
    } catch (e) {
      print('Update check failed: $e');
    }

    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    final isFirstLaunch = await _storageService.isFirstLaunch();
    final savedPasscode = await _storageService.getPasscode();

    if (isFirstLaunch || savedPasscode == null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const OnboardingScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const VerifyPasscodeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Payza',
              style: GoogleFonts.poppins(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.blueAccent,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 20),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blueAccent),
            ),
          ],
        ),
      ),
    );
  }
}
