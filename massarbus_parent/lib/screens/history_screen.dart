// lib/screens/history_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:ui'; 
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart'; 

class HistoryScreen extends StatefulWidget {
  final String studentId;
  final String studentName;

  const HistoryScreen({super.key, required this.studentId, required this.studentName});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = true;
  List<dynamic> _history = [];

  final String baseUrl = 'http://192.168.42.115:5000/api'; 

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  // Récupération de l'historique
  Future<void> _fetchHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      
      final url = '$baseUrl/trips/history/${widget.studentId}';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _history = json.decode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<bool> _deleteHistoryItem(String historyId, int index) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('massarbus_token');
      
      final url = '$baseUrl/trips/history/$historyId';

      final response = await http.delete(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Enregistrement supprimé avec succès 🗑️'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return true; 
      } else {
        throw Exception("Erreur serveur");
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erreur lors de la suppression.'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false; 
    }
  }

  Future<bool?> _confirmDeletion() {
    return showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
              SizedBox(width: 10),
              Text('Supprimer ?', style: TextStyle(color: Colors.white)),
            ],
          ),
          content: const Text(
            'Voulez-vous vraiment supprimer cet enregistrement de l\'historique ? Cette action est irréversible.',
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
              child: const Text('Supprimer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true, 
      backgroundColor: const Color(0xFF0B1120),
      
      appBar: AppBar(
        title: Text('Historique - ${widget.studentName}', style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent, 
        elevation: 0,
        flexibleSpace: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(color: const Color(0xFF0B1120).withOpacity(0.6)),
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

          Container(
            color: const Color(0xFF0B1120).withOpacity(0.85), 
          ),

          _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
              : _history.isEmpty
                  ? Center(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Aucun historique de trajet pour le moment.',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.only(top: 120, left: 20, right: 20, bottom: 40), 
                      itemCount: _history.length,
                      itemBuilder: (context, index) {
                        final item = _history[index];
                        final date = DateTime.parse(item['date']).toLocal();
                        final formattedDate = DateFormat('dd/MM/yyyy à HH:mm').format(date);
                        
                        final isBoarded = item['status'] == 'BOARDED';
                        final historyId = item['_id'];

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Dismissible(
                            key: Key(historyId),
                            direction: DismissDirection.endToStart,
                            
                            background: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                color: Colors.redAccent,
                                alignment: Alignment.centerRight,
                                child: const Icon(Icons.delete_sweep_rounded, color: Colors.white, size: 30),
                              ),
                            ),
                            
                            confirmDismiss: (direction) async {
                              return await _confirmDeletion();
                            },
                            
                            onDismissed: (direction) async {
                              setState(() {
                                _history.removeAt(index);
                              });
                              await _deleteHistoryItem(historyId, index);
                            },

                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1E293B).withOpacity(0.4), 
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border(
                                      left: BorderSide(
                                        color: isBoarded ? Colors.blueAccent : Colors.greenAccent, 
                                        width: 5
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: isBoarded ? Colors.blueAccent.withOpacity(0.2) : Colors.greenAccent.withOpacity(0.2),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          isBoarded ? Icons.login_rounded : Icons.logout_rounded,
                                          color: isBoarded ? Colors.blueAccent : Colors.greenAccent,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              isBoarded ? 'Monté(e) dans le bus' : 'Descendu(e) du bus',
                                              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              formattedDate,
                                              style: const TextStyle(color: Colors.white70, fontSize: 14),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(Icons.chevron_left_rounded, color: Colors.white.withOpacity(0.2)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
        ],
      ),
    );
  }
}