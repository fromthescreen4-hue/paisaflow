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
  final String _currentVersion = "1.0.0";
  final String _configUrl = "https://fromthescreen4-hue.github.io/Payza/config.json";

  @override
  void initState() {
    super.initState();
    _checkAppStatus();
  }

  Future<void> _checkAppStatus() async {
    try {
      final response = await http.get(Uri.parse(_configUrl));
      if (response.statusCode == 200) {
        final config = json.decode(response.body);
        String minVersion = config['min_version'];
        String updateUrl = config['update_url'];

        if (minVersion != _currentVersion) {
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => ForceUpdateScreen(updateUrl: updateUrl),
            ),
          );
          return;
        }
      }
    } catch (e) {
      debugPrint('Update check failed: $e');
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
