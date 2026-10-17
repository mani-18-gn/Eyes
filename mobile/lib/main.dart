import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:realitylens/core/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: RealityLensApp()));
}

class RealityLensApp extends StatelessWidget {
  const RealityLensApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealityLens',
      debugShowCheckedModeBanner: false,
      theme: RealityTheme.darkTheme,
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    _HomeScreenPlaceholder(),
    _BrainScreenPlaceholder(),
    _LensScreenPlaceholder(),
    _DiscoverScreenPlaceholder(),
    _MeScreenPlaceholder(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: RealityTheme.surfaceBg.withOpacity(0.95),
          border: const Border(top: BorderSide(color: Colors.white12)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: RealityTheme.violetAccent,
          unselectedItemColor: RealityTheme.textMuted,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: [
            const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'HOME'),
            const BottomNavigationBarItem(icon: Icon(Icons.psychology_outlined), label: 'BRAIN'),
            BottomNavigationBarItem(
              icon: Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [RealityTheme.violetAccent, RealityTheme.cyanAccent],
                  ),
                ),
                child: const Icon(Icons.camera_alt, color: Colors.white, size: 26),
              ),
              label: 'LENS',
            ),
            const BottomNavigationBarItem(icon: Icon(Icons.explore_outlined), label: 'DISCOVER'),
            const BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'ME'),
          ],
        ),
      ),
    );
  }
}

class _HomeScreenPlaceholder extends StatelessWidget {
  const _HomeScreenPlaceholder();
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'REALITYLENS',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 13, color: RealityTheme.violetAccent),
            ),
            const SizedBox(height: 8),
            const Text('What are we looking at?', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: RealityTheme.cardBg,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.camera_enhance, color: RealityTheme.cyanAccent, size: 36),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('OPEN LENS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('Point your camera at reality', style: TextStyle(color: RealityTheme.textMuted, fontSize: 12)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios, size: 16, color: RealityTheme.textMuted),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('RECENT LENS SCANS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: RealityTheme.textMuted)),
            const Expanded(
              child: Center(
                child: Text('Your Lens history will appear here.', style: TextStyle(color: RealityTheme.textMuted, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BrainScreenPlaceholder extends StatelessWidget {
  const _BrainScreenPlaceholder();
  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text('Personal Brain Knowledge Index', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _LensScreenPlaceholder extends StatelessWidget {
  const _LensScreenPlaceholder();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Text('RealityLens Camera & Computer Vision Engine', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}

class _DiscoverScreenPlaceholder extends StatelessWidget {
  const _DiscoverScreenPlaceholder();
  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text('Discover Specialized Reality Lenses', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _MeScreenPlaceholder extends StatelessWidget {
  const _MeScreenPlaceholder();
  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text('Profile, Privacy & AI Personality', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
