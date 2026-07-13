// lib/main.dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart'; 

import 'firebase_options.dart'; 
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart'; 

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  print("Notification reçue en arrière-plan : ${message.notification?.title}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final prefs = await SharedPreferences.getInstance();
  final bool hasSeenOnboarding = prefs.getBool('has_seen_onboarding') ?? false;

  runApp(MassarBusParentApp(showHome: hasSeenOnboarding));
}

class MassarBusParentApp extends StatelessWidget {
  final bool showHome; 

  const MassarBusParentApp({super.key, required this.showHome});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MassarBus Parent',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF111827), 
        primaryColor: Colors.blueAccent,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1F2937),
          elevation: 0,
        ),
      ),
      home: showHome ? const LoginScreen() : const OnboardingScreen(), 
    );
  }
}