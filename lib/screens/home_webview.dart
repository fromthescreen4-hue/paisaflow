import 'dart:ui' as ui;
import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'error_screen.dart';

class HomeWebView extends StatefulWidget {
  const HomeWebView({super.key});

  @override
  State<HomeWebView> createState() => _HomeWebViewState();
}

class _HomeWebViewState extends State<HomeWebView> {
  final String _viewId = 'payza-iframe';
  final String _url = 'https://fromthescreen4-hue.github.io/Payza/index.html';
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _registerIframe();
  }

  void _registerIframe() {
    // Register the iframe element
    // ignore: undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory(
      _viewId,
      (int viewId) {
        final element = html.IFrameElement()
          ..src = _url
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%';

        element.onLoad.listen((event) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _hasError = false;
            });
          }
        });

        return element;
      },
    );

    // Safety timeout for loading indicator / Server Busy
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted && _isLoading) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    });
  }

  void _retry() {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    // We re-register or just wait for the timeout again
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted && _isLoading) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return ErrorScreen(onRetry: _retry);
    }

    return Scaffold(
      body: Stack(
        children: [
          HtmlElementView(viewType: _viewId),
          if (_isLoading)
            Container(
              color: Colors.white,
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.blueAccent),
                    ),
                    SizedBox(height: 20),
                    Text(
                      'Connecting to Payza...',
                      style: TextStyle(
                        color: Colors.blueAccent,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
