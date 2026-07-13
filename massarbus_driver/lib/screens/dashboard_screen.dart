// lib/screens/dashboard_screen.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:slide_to_act/slide_to_act.dart'; 
import 'student_list_screen.dart';
import 'package:marquee/marquee.dart';

class DashboardScreen extends StatefulWidget {
  final String tripId;
  final String busId;
  final String routeName;

  const DashboardScreen({
    super.key,
    required this.tripId,
    required this.busId,
    required this.routeName,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  IO.Socket? socket;
  bool isTracking = false;
  Position? currentPosition;
  StreamSubscription<Position>? positionStream;

  final Color bgDark = const Color(0xFF0B1120); 
  final Color bgCard = const Color(0xFF1E293B);
  final Color accentOrange = const Color(0xFFF59E0B);
  final Color accentBlue = const Color(0xFF3B82F6);

  final GlobalKey<SlideActionState> _slideActionKey = GlobalKey();
  
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _initSocket();
    
    // Configuration du Radar Pulsatile
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  void _showPremiumNotification(String title, String message, Color accentColor, IconData icon) {
    final overlay = Overlay.of(context);
    final overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: 60.0,
        left: 20.0,
        right: 20.0,
        child: Material(
          color: Colors.transparent,
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: -100.0, end: 0.0),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
            builder: (context, value, child) {
              return Transform.translate(
                offset: Offset(0, value),
                child: child,
              );
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: bgCard.withOpacity(0.95),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: accentColor.withOpacity(0.5), width: 1.5),
                boxShadow: [
                  BoxShadow(color: accentColor.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10))
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: accentColor.withOpacity(0.2), shape: BoxShape.circle),
                    child: Icon(icon, color: accentColor, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text(message, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);
    // Disparition automatique après 4 secondes
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) overlayEntry.remove();
    });
  }

  Future<void> _initSocket() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('massarbus_token');
    if (token == null) return;

    final String serverUrl = 'http://192.168.42.115:5000'; // Ton IP confirmée

    socket = IO.io(serverUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {'token': token},
    });

    socket!.connect();
    socket!.onConnect((_) {
      print('🟢 Connecté au WebSocket backend !');
      _showPremiumNotification('Système en ligne', 'Connecté au serveur MassarBus avec succès.', Colors.greenAccent, Icons.cloud_done_rounded);
    });
    socket!.onDisconnect((_) => print('🔴 Déconnecté du WebSocket'));
  }

  Future<void> _startTracking() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _slideActionKey.currentState?.reset(); // Remet le slider à zéro
        return;
      }
    }

    setState(() => isTracking = true);
    _showPremiumNotification('Trajet Démarré', 'Le radar GPS est actif. Bonne route !', accentBlue, Icons.satellite_alt_rounded);

    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5, 
    );

    positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (Position position) {
        setState(() => currentPosition = position);
        
        if (socket != null && socket!.connected) {
          socket!.emit('update_location', {
            "tripId": widget.tripId,
            "busId": widget.busId,
            "latitude": position.latitude,
            "longitude": position.longitude,
            "speed": (position.speed * 3.6).round()
          });
        }
      } 
    );
  }

  void _stopTracking() {
    positionStream?.cancel();
    setState(() => isTracking = false);
  }

  Future<void> _attemptToEndTrip() async {
    // Affiche un loader
    showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator(color: Colors.redAccent)));

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      final manifestUrl = Uri.parse('http://192.168.42.115:5000/api/trips/${widget.tripId}/manifest');
      
      final response = await http.get(manifestUrl, headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      });

      if (mounted) Navigator.pop(context); 

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final manifestByStop = data['manifest'] as Map<String, dynamic>? ?? {};
        
        int studentsBoarded = 0;
        int studentsDropped = 0;
        int studentsPending = 0;

        manifestByStop.forEach((stopName, studentsList) {
          for (var s in studentsList) {
            if (s['status'] == 'BOARDED') studentsBoarded++;
            else if (s['status'] == 'DROPPED') studentsDropped++;
            else studentsPending++;
          }
        });

        _showEndTripSummary(studentsBoarded, studentsDropped, studentsPending);
      } else {
        _slideActionKey.currentState?.reset();
        _showPremiumNotification('Erreur', 'Impossible de vérifier les élèves.', Colors.redAccent, Icons.error_outline);
      }
    } catch (e) {
      if (mounted) Navigator.pop(context); 
      _slideActionKey.currentState?.reset();
      _showPremiumNotification('Erreur Réseau', 'Le serveur ne répond pas.', Colors.redAccent, Icons.wifi_off_rounded);
    }
  }

  void _showEndTripSummary(int boarded, int dropped, int pending) {
    bool hasDanger = boarded > 0;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Icon(hasDanger ? Icons.warning_amber_rounded : Icons.check_circle_outline, 
                  color: hasDanger ? Colors.redAccent : Colors.greenAccent, size: 32),
              const SizedBox(width: 10),
              const Text('Bilan du Trajet', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBilanRow(Icons.hail_rounded, 'Élèves arrivés', dropped.toString(), Colors.greenAccent),
              _buildBilanRow(Icons.access_time_rounded, 'Élèves absents', pending.toString(), Colors.grey),
              const SizedBox(height: 16),
              if (hasDanger)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.redAccent.withOpacity(0.15), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.redAccent.withOpacity(0.5))),
                  child: Text('⚠️ ATTENTION : Il reste $boarded élève(s) à bord ! Vous devez les faire descendre avant de clôturer le trajet.',
                    style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, height: 1.5),
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _slideActionKey.currentState?.reset(); // Remet le slider
              },
              child: const Text('Annuler', style: TextStyle(color: Colors.grey)),
            ),
            if (!hasDanger) 
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _finalizeTrip(); 
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('Confirmer la fin', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
          ],
        );
      },
    );
  }

  Widget _buildBilanRow(IconData icon, String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white70, fontSize: 16))),
          Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Future<void> _finalizeTrip() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      final url = Uri.parse('http://192.168.42.115:5000/api/trips/${widget.tripId}/end');

      await http.put(url, headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'});

      _stopTracking(); 

      if (mounted) {
        _showPremiumNotification('Mission Terminée', 'Le trajet a été archivé avec succès.', Colors.greenAccent, Icons.task_alt_rounded);
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) Navigator.pop(context);
        });
      }
    } catch (e) {
      _slideActionKey.currentState?.reset();
      _showPremiumNotification('Erreur', 'Impossible de clôturer le trajet.', Colors.redAccent, Icons.error);
    }
  }

  Future<void> _reportIssue(String message) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      final url = Uri.parse('http://192.168.42.115:5000/api/trips/${widget.tripId}/issue');
      
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: json.encode({"issueMessage": message}),
      );

      if (response.statusCode == 200) {
        if (socket != null && socket!.connected) {
          socket!.emit('driver_alert', {"routeName": widget.routeName, "message": message});
        }
        _showPremiumNotification('URGENCE SIGNALÉE', 'La direction et les parents ont été alertés immédiatement.', accentOrange, Icons.campaign_rounded);
      }
    } catch (e) {
      _showPremiumNotification('Erreur Réseau', 'L\'alerte n\'a pas pu être envoyée.', Colors.redAccent, Icons.wifi_off_rounded);
    }
  }

  void _showIssueDialog() {
    final List<String> issues = [
      "Panne mécanique (Bus immobilisé)",
      "Embouteillage majeur (Retard important)",
      "Urgence médicale à bord",
      "Accident de la circulation",
      "Autre problème technique"
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true, 
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return SingleChildScrollView( 
          child: Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20, 
              left: 20, right: 20, top: 20
            ),
            decoration: BoxDecoration(
              color: bgCard,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 20)],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 40, height: 5, decoration: BoxDecoration(color: Colors.grey.withOpacity(0.3), borderRadius: BorderRadius.circular(10))),
                const SizedBox(height: 20),
                const Row(
                  children: [
                    Icon(Icons.warning_rounded, color: Colors.orangeAccent, size: 30),
                    SizedBox(width: 15),
                    Text('Signaler une Urgence', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 20),
                ...issues.map((issue) => Card(
                  color: bgDark,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.white.withOpacity(0.05))),
                  child: ListTile(
                    title: Text(issue, style: const TextStyle(color: Colors.white70)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.orangeAccent, size: 16),
                    onTap: () {
                      Navigator.pop(context);
                      _reportIssue(issue); 
                    },
                  ),
                )),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _stopTracking();
    socket?.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
       title: SizedBox(
  height: 30,
  child: Marquee(
    text: widget.routeName,
    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
    scrollAxis: Axis.horizontal,
    crossAxisAlignment: CrossAxisAlignment.center,
    blankSpace: 50.0, 
    velocity: 35.0, 
    pauseAfterRound: const Duration(seconds: 2), 
    startPadding: 10.0,
    accelerationDuration: const Duration(seconds: 1),
    accelerationCurve: Curves.linear,
    decelerationDuration: const Duration(milliseconds: 500),
    decelerationCurve: Curves.easeOut,
  ),
),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: Icon(Icons.logout_rounded, color: Colors.redAccent.withOpacity(0.8)),
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              if (mounted) Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
            },
          )
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 5,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Le Radar Animé
                    AnimatedBuilder(
                      animation: _pulseAnimation,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: isTracking ? _pulseAnimation.value : 1.0,
                          child: Container(
                            padding: const EdgeInsets.all(40),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isTracking ? accentBlue.withOpacity(0.1) : bgCard,
                              boxShadow: isTracking ? [
                                BoxShadow(color: accentBlue.withOpacity(0.3), blurRadius: 40, spreadRadius: 10 * _pulseAnimation.value)
                              ] : [],
                            ),
                            child: Icon(
                              isTracking ? Icons.satellite_alt_rounded : Icons.gps_off_rounded,
                              size: 80,
                              color: isTracking ? accentBlue : Colors.grey,
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 40),
                    Text(
                      isTracking ? 'Diffusion en direct...' : 'En attente de départ',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.2),
                    ),
                    const SizedBox(height: 16),
                    
                    // Panneau d'informations en verre
                    if (currentPosition != null && isTracking)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 40),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: bgCard.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              children: [
                                const Text('VITESSE', style: TextStyle(color: Colors.grey, fontSize: 10, letterSpacing: 2)),
                                const SizedBox(height: 4),
                                Text('${(currentPosition!.speed * 3.6).round()} km/h', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            Container(width: 1, height: 40, color: Colors.white.withOpacity(0.1)),
                            Column(
                              children: [
                                const Text('LAT / LNG', style: TextStyle(color: Colors.grey, fontSize: 10, letterSpacing: 2)),
                                const SizedBox(height: 4),
                                Text('${currentPosition!.latitude.toStringAsFixed(3)} / ${currentPosition!.longitude.toStringAsFixed(3)}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            
            //BAS : ACTIONS ET SLIDER 
            Expanded(
              flex: 4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
                decoration: BoxDecoration(
                  color: bgCard,
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(40), topRight: Radius.circular(40)),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, -5))],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Boutons secondaires
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(builder: (context) => StudentListScreen(tripId: widget.tripId)));
                            },
                            icon: const Icon(Icons.people_alt_rounded, color: Colors.white),
                            label: const Text('Liste d\'appel', style: TextStyle(color: Colors.white)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: BorderSide(color: Colors.white.withOpacity(0.2)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _showIssueDialog,
                            icon: const Icon(Icons.campaign_rounded, color: Colors.white),
                            label: const Text('SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accentOrange,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 30),

                    // LE SLIDER "GLISSER POUR DÉMARRER / ARRÊTER"
                    SlideAction(
                      key: _slideActionKey,
                      onSubmit: () async {
                        if (isTracking) {
                          await _attemptToEndTrip();
                        } else {
                          await _startTracking();
                          // Pour que le slider revienne à sa place mais change de couleur
                          Future.delayed(const Duration(milliseconds: 500), () => _slideActionKey.currentState?.reset());
                        }
                        return null;
                      },
                      innerColor: Colors.white,
                      outerColor: isTracking ? Colors.redAccent.withOpacity(0.8) : accentBlue,
                      elevation: 0,
                      sliderButtonIconSize: 24,
                      sliderButtonIcon: Icon(
                        isTracking ? Icons.stop_rounded : Icons.play_arrow_rounded,
                        color: isTracking ? Colors.redAccent : accentBlue,
                      ),
                      text: isTracking ? 'GLISSER POUR CLÔTURER' : 'GLISSER POUR DÉMARRER',
                      textStyle: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.5),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}