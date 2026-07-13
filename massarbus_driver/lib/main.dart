// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const MassarBusDriverApp());
}

class MassarBusDriverApp extends StatelessWidget {
  const MassarBusDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MassarBus Driver',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(
          0xFF111827,
        ), 
        primaryColor: Colors.blueAccent,
        colorScheme: const ColorScheme.dark(primary: Colors.blueAccent),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1F2937), 
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Colors.blueAccent, width: 2),
          ),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}
