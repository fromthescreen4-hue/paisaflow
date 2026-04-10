import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyPasscode = 'passcode';
  static const String _keyIsFirstLaunch = 'is_first_launch';

  Future<void> savePasscode(String passcode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyPasscode, passcode);
  }

  Future<String?> getPasscode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyPasscode);
  }

  Future<bool> isFirstLaunch() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyIsFirstLaunch) ?? true;
  }

  Future<void> setFirstLaunchComplete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyIsFirstLaunch, false);
  }
}
