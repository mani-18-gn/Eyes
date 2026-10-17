import 'package:flutter/material.dart';

class RealityTheme {
  static const Color obsidianBg = Color(0xFF07080D);
  static const Color surfaceBg = Color(0xFF101322);
  static const Color cardBg = Color(0xFF141726);
  static const Color violetAccent = Color(0xFF8B5CF6);
  static const Color cyanAccent = Color(0xFF06B6D4);
  static const Color emeraldSuccess = Color(0xFF10B981);
  static const Color amberWarning = Color(0xFFF59E0B);
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: obsidianBg,
      primaryColor: violetAccent,
      colorScheme: const ColorScheme.dark(
        primary: violetAccent,
        secondary: cyanAccent,
        surface: surfaceBg,
        error: amberWarning,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: obsidianBg,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        color: cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.white10),
        ),
      ),
    );
  }
}
