// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'home_screen.dart'; 

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  
  bool _isLoading = false;
  String _errorMessage = '';
  
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

  final Color bgDark = const Color(0xFF0B1120); 
  final Color bgCard = const Color(0xFF1E293B);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  final String apiUrl = 'http://192.168.42.115:5000/api/auth/login';

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutExpo,
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': _emailController.text.trim(),
          'password': _passwordController.text.trim(),
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('massarbus_token', data['token']);
        
        if (mounted) {
          Navigator.pushReplacement(
            context,
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) => const HomeScreen(),
              transitionsBuilder: (context, animation, secondaryAnimation, child) {
                return FadeTransition(opacity: animation, child: child);
              },
              transitionDuration: const Duration(milliseconds: 500),
            ),
          );
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: Colors.white),
                  SizedBox(width: 12),
                  Text('Connexion réussie', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              backgroundColor: const Color(0xFF10B981).withOpacity(0.9),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'Erreur de connexion.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      body: Stack(
        children: [
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    accentOrange.withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 32.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      
                      Center(
                        child: Image.asset(
                          'assets/logo.png', 
                          height: 180, 
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return const Icon(Icons.family_restroom_rounded, size: 80, color: Colors.white);
                          },
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      RichText(
                        textAlign: TextAlign.center,
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 30, 
                            fontWeight: FontWeight.w900, 
                            letterSpacing: 2.5,
                            fontFamily: 'Roboto', 
                          ),
                          children: [
                            const TextSpan(
                              text: 'MASSAR',
                              style: TextStyle(color: Colors.white),
                            ),
                            TextSpan(
                              text: 'BUS',
                              style: TextStyle(color: accentOrange),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'PORTAIL PARENTS',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12, 
                          color: accentBlue, 
                          fontWeight: FontWeight.bold,
                          letterSpacing: 3,
                        ),
                      ),
                      const SizedBox(height: 48),

                      AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        child: _errorMessage.isNotEmpty
                            ? Container(
                                padding: const EdgeInsets.all(16),
                                margin: const EdgeInsets.only(bottom: 24),
                                decoration: BoxDecoration(
                                  color: Colors.redAccent.withOpacity(0.1),
                                  border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 20),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(_errorMessage, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                                    ),
                                  ],
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),

                      _buildTextField(
                        controller: _emailController,
                        label: 'Adresse Email',
                        icon: Icons.email_rounded,
                        isEmail: true,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _passwordController,
                        label: 'Mot de passe',
                        icon: Icons.lock_rounded,
                        isPassword: true,
                      ),
                      const SizedBox(height: 40),

                      Container(
                        height: 55,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: LinearGradient(
                            colors: [accentBlue, const Color(0xFF1E88E5)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: accentBlue.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : const Text(
                                  'SE CONNECTER',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.2),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    bool isEmail = false,
  }) {
    return TextField(
      controller: controller,
      obscureText: isPassword,
      keyboardType: isEmail ? TextInputType.emailAddress : TextInputType.text,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey.shade500),
        prefixIcon: Icon(icon, color: accentBlue.withOpacity(0.8)),
        filled: true,
        fillColor: bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: accentBlue, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 20),
      ),
    );
  }
}