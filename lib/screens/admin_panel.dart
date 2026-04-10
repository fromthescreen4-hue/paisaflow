import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/storage_service.dart';

class AdminPanel extends StatefulWidget {
  const AdminPanel({super.key});

  @override
  State<AdminPanel> createState() => _AdminPanelState();
}

class _AdminPanelState extends State<AdminPanel> {
  final StorageService _storageService = StorageService();
  String? _passcode;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final pass = await _storageService.getPasscode();
    setState(() {
      _passcode = pass;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Payza Admin', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildHeader('Security Settings'),
          _buildInfoTile('Current Passcode', _passcode ?? 'Not Set', Icons.lock_outline),
          const Divider(),
          _buildHeader('App Controls'),
          _buildActionTile('Force Update (Server Mock)', 'Toggle update requirement', Icons.system_update_alt, () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Update status updated on server (Mock)')),
            );
          }),
          _buildActionTile('Reset User Data', 'Wipe local storage and passcode', Icons.delete_forever, () async {
            // This is for local simulation - normally you'd use a DB
            final prefs = await _storageService.isFirstLaunch();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('User storage cleared for this device.')),
            );
          }),
          const Divider(),
          _buildHeader('Analytics (Mock)'),
          _buildInfoTile('Active Users', '1', Icons.people_outline),
          _buildInfoTile('App Version', '1.0.0', Icons.info_outline),
        ],
      ),
    );
  }

  Widget _buildHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(
        title,
        style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueAccent),
      ),
    );
  }

  Widget _buildInfoTile(String title, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey),
      title: Text(title, style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey[600])),
      trailing: Text(value, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildActionTile(String title, String sub, IconData icon, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueAccent),
      title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
      subtitle: Text(sub, style: GoogleFonts.poppins(fontSize: 12)),
      onTap: onTap,
    );
  }
}
