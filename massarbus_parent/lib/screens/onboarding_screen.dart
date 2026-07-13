// lib/screens/onboarding_screen.dart
import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  bool isLastPage = false;

  final Color bgDark = const Color(0xFF0B1120);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  late final List<Map<String, dynamic>> onboardingData;

  @override
  void initState() {
    super.initState();
    onboardingData = [
  {
    "image": "assets/onboarding_1.png",
    "title": "Bienvenue sur MassarBus",
    "description":
        "Suivez le transport scolaire de votre enfant en toute sécurité, où que vous soyez.",
    "alignment": const Alignment(-0.6, 0.0),
  },
  {
    "image": "assets/onboarding_2.png",
    "title": "Suivi en temps réel",
    "description":
        "Visualisez la position du bus et son heure d'arrivée directement sur votre téléphone.",
    "alignment": const Alignment(-0.8, 0.0),
  },
  {
    "image": "assets/onboarding_3.png",
    "title": "Notifications instantanées",
    "description":
        "Recevez des alertes pour chaque étape importante du trajet de votre enfant.",
    "alignment": Alignment.center,
  },
  {
    "image": "assets/onboarding_4.png",
    "title": "Roulez l'esprit tranquille",
    "description":
        "Absences, informations et alertes : tout est réuni dans une seule application.",
    "alignment": Alignment.center,
  }
];
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_onboarding', true);
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
          transitionDuration: const Duration(milliseconds: 600),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      body: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            onPageChanged: (index) {
              setState(() => isLastPage = index == 3);
            },
            itemCount: onboardingData.length,
            itemBuilder: (context, index) {
              final data = onboardingData[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    data["image"],
                    fit: BoxFit.cover,
                   
                    alignment: const Alignment(0.1, -0.2), 
                  ),
                  
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          bgDark.withOpacity(0.2),
                          bgDark.withOpacity(0.85),
                          bgDark,
                          bgDark,
                        ],
                        stops: const [0.0, 0.4, 0.65, 0.85, 1.0],
                      ),
                    ),
                  ),

                  SafeArea(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          constraints: BoxConstraints(
                            maxHeight: MediaQuery.of(context).size.height * 0.50, 
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 32.0),
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start, 
                              children: [
                                Text(
                                  data["title"],
                                  style: const TextStyle(
                                    color: Colors.white, 
                                    fontSize: 34, 
                                    fontWeight: FontWeight.w900, 
                                    letterSpacing: 1.2,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  data["description"],
                                  style: const TextStyle(
                                    color: Colors.white70, 
                                    fontSize: 16, 
                                    height: 1.6,
                                  ),
                                ),
                                const SizedBox(height: 130), 
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),

          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 16.0, top: 8.0),
                child: TextButton(
                  onPressed: _completeOnboarding,
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.black.withOpacity(0.3), 
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                  child: const Text("Passer", style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ),

          Positioned(
            bottom: 40,
            left: 32,
            right: 32,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                SmoothPageIndicator(
                  controller: _controller,
                  count: onboardingData.length,
                  effect: ExpandingDotsEffect(
                    activeDotColor: accentOrange,
                    dotColor: Colors.white.withOpacity(0.3),
                    dotHeight: 6,
                    dotWidth: 8,
                    expansionFactor: 4, 
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 55,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    gradient: LinearGradient(
                      colors: isLastPage ? [accentOrange, const Color(0xFFD97706)] : [accentBlue, const Color(0xFF1E88E5)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isLastPage ? accentOrange.withOpacity(0.5) : accentBlue.withOpacity(0.5),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () {
                      if (isLastPage) {
                        _completeOnboarding();
                      } else {
                        _controller.nextPage(duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      padding: EdgeInsets.symmetric(horizontal: isLastPage ? 32 : 24),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          isLastPage ? "COMMENCER" : "SUIVANT",
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                        if (!isLastPage) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                        ]
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}