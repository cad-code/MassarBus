// lib/screens/profile_screen.dart
import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart'; 

import 'login_screen.dart'; 
import 'dart:convert';
import 'package:http/http.dart' as http;

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Color bgDark = const Color(0xFF0B1120);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  String parentName = "Chargement...";
  String parentEmail = "chargement@email.com";
  int childrenCount = 0;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      
      final String apiUrl = 'http://192.168.42.115:5000/api/users/profile'; 

      final response = await http.get(
        Uri.parse(apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        if (mounted) {
          setState(() {
            parentName = data['name'] ?? "Utilisateur";
            parentEmail = data['email'] ?? "";
            childrenCount = data['childrenCount'] ?? 0;
          });
        }
      } else {
        debugPrint("Erreur de récupération : ${response.statusCode} - ${response.body}");
      }
    } catch (e) {
      debugPrint("Erreur réseau profil : $e");
    }
  }

  void _showComingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.construction_rounded, color: Colors.white),
            SizedBox(width: 10),
            Text('Cette fonctionnalité arrive bientôt ', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: accentBlue,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri phoneUri = Uri(scheme: 'tel', path: phoneNumber);
    
    try {
      if (await canLaunchUrl(phoneUri)) {
        await launchUrl(phoneUri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Impossible de lancer l\'appel.'), backgroundColor: Colors.redAccent),
          );
        }
      }
    } catch (e) {
      debugPrint("Erreur d'appel: $e");
    }
  }

  Future<void> _confirmLogout() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.logout_rounded, color: Colors.redAccent),
              SizedBox(width: 10),
              Text('Déconnexion', style: TextStyle(color: Colors.white)),
            ],
          ),
          content: const Text(
            'Êtes-vous sûr de vouloir vous déconnecter de MassarBus ?',
            style: TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Se déconnecter', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('massarbus_token');
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (Route<dynamic> route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: bgDark,
      appBar: AppBar(
        title: const Text('Mon Profil', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(color: bgDark.withOpacity(0.6)),
          ),
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/histrory_bg.png',
            fit: BoxFit.cover,
            alignment: Alignment.center,
          ),
          // OVERLAY SOMBRE
          Container(
            color: bgDark.withOpacity(0.85),
          ),

          SingleChildScrollView(
            padding: const EdgeInsets.only(top: 120, left: 20, right: 20, bottom: 40),
            child: Column(
              children: [
                Center(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: accentOrange, width: 3),
                          boxShadow: [
                            BoxShadow(color: accentOrange.withOpacity(0.3), blurRadius: 20, spreadRadius: 2)
                          ]
                        ),
                        child: CircleAvatar(
                          radius: 45,
                          backgroundColor: accentBlue.withOpacity(0.2),
                          child: Icon(Icons.person_rounded, size: 50, color: accentBlue),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        parentName,
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      // BADGE ENFANTS
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: accentOrange.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: accentOrange.withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.family_restroom_rounded, color: accentOrange, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              '$childrenCount enfant(s) inscrit(s)',
                              style: TextStyle(color: accentOrange, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 40),

                _buildSectionTitle('TRANSPORT & ASSISTANCE'),
                _buildSettingsCard([
                  _buildListTile(
                    Icons.support_agent_rounded, 
                    'Contacter le Chauffeur', 
                    Colors.greenAccent, 
                    () => _makePhoneCall('+212697286339'),
                    subtitle: 'Ligne directe (Urgences uniquement)',
                  ),
                  _buildDivider(),
                  _buildListTile(
                    Icons.account_balance_rounded, 
                    'Administration', 
                    accentBlue, 
                    () => _makePhoneCall('+212535000000'),
                    subtitle: 'De Lundi à Vendredi, 9h-17h',
                  ),
                ]),

                const SizedBox(height: 24),

                _buildSectionTitle('SÉCURITÉ'),
                _buildSettingsCard([
                  _buildListTile(
                    Icons.verified_user_rounded, 
                    'Personnes Autorisées', 
                    Colors.tealAccent, 
                    _showComingSoon,
                    subtitle: 'Délégation de récupération',
                    trailingWidget: _buildComingSoonBadge(),
                  ),
                ]),

                const SizedBox(height: 24),

                _buildSectionTitle('PRÉFÉRENCES'),
                _buildSettingsCard([
                  _buildListTile(
                    Icons.language_rounded, 
                    'Langue', 
                    Colors.white, 
                    _showComingSoon, 
                    subtitle: 'Français',
                  ),
                  _buildDivider(),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.deepPurpleAccent.withOpacity(0.2), shape: BoxShape.circle),
                      child: const Icon(Icons.dark_mode_rounded, color: Colors.deepPurpleAccent, size: 22),
                    ),
                    title: const Text('Mode d\'affichage', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Mode Nuit Premium (Verrouillé)', style: TextStyle(color: Colors.white54, fontSize: 12)),
                    trailing: const Icon(Icons.lock_rounded, color: Colors.white24, size: 18),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Le Mode Nuit Premium est activé par défaut pour cette application.'), backgroundColor: Colors.deepPurpleAccent),
                      );
                    },
                  ),
                ]),

                const SizedBox(height: 40),

                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: _confirmLogout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent.withOpacity(0.1),
                      foregroundColor: Colors.redAccent,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded),
                        SizedBox(width: 10),
                        Text('DÉCONNEXION', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 10, bottom: 10),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5),
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.4),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(children: children),
        ),
      ),
    );
  }

  Widget _buildListTile(IconData icon, String title, Color iconColor, VoidCallback onTap, {String? subtitle, Widget? trailingWidget}) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      subtitle: subtitle != null ? Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 12)) : null,
      trailing: trailingWidget ?? const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white24, size: 16),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return Divider(color: Colors.white.withOpacity(0.05), height: 1, indent: 60, endIndent: 20);
  }

  Widget _buildComingSoonBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: accentBlue.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accentBlue.withOpacity(0.5)),
      ),
      child: const Text('PROCHAINEMENT', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
    );
  }
}