import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/storage_service.dart';
import 'home_webview.dart';

class VerifyPasscodeScreen extends StatefulWidget {
  const VerifyPasscodeScreen({super.key});

  @override
  State<VerifyPasscodeScreen> createState() => _VerifyPasscodeScreenState();
}

class _VerifyPasscodeScreenState extends State<VerifyPasscodeScreen> {
  final StorageService _storageService = StorageService();
  String _passcode = '';
  String? _savedPasscode;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadSavedPasscode();
  }

  Future<void> _loadSavedPasscode() async {
    _savedPasscode = await _storageService.getPasscode();
  }

  void _onDigitPressed(String digit) {
    if (_passcode.length < 4) {
      setState(() {
        _passcode += digit;
        _errorMessage = '';
      });
    }

    if (_passcode.length == 4) {
      _verifyPasscode();
    }
  }

  void _onDelete() {
    if (_passcode.isNotEmpty) {
      setState(() {
        _passcode = _passcode.substring(0, _passcode.length - 1);
        _errorMessage = '';
      });
    }
  }

  void _verifyPasscode() {
    if (_passcode == _savedPasscode) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HomeWebView()),
      );
    } else {
      setState(() {
        _passcode = '';
        _errorMessage = 'Invalid passcode. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 60),
            Text(
              'Enter Passcode',
              style: GoogleFonts.poppins(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Enter your 4-digit passcode to unlock Payza.',
              style: GoogleFonts.poppins(
                fontSize: 16,
                color: Colors.black54,
              ),
            ),
            const SizedBox(height: 60),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: index < _passcode.length
                        ? Colors.blueAccent
                        : Colors.grey[300],
                  ),
                );
              }),
            ),
            if (_errorMessage.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                _errorMessage,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: Colors.redAccent,
                ),
              ),
            ],
            const Spacer(),
            _buildNumberPad(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildNumberPad() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        children: [
          for (var row in [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ])
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: row
                  .map((digit) => _buildNumberButton(digit))
                  .toList(),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              const SizedBox(width: 80),
              _buildNumberButton('0'),
              SizedBox(
                width: 80,
                child: IconButton(
                  onPressed: _onDelete,
                  icon: const Icon(Icons.backspace_outlined, size: 28),
                  color: Colors.black87,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNumberButton(String digit) {
    return Container(
      margin: const EdgeInsets.all(10),
      child: InkWell(
        onTap: () => _onDigitPressed(digit),
        borderRadius: BorderRadius.circular(40),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.grey[200]!, width: 1),
          ),
          child: Center(
            child: Text(
              digit,
              style: GoogleFonts.poppins(
                fontSize: 28,
                fontWeight: FontWeight.w500,
                color: Colors.black87,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
