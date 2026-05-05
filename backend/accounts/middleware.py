class LanguageMiddleware:
    """Middleware to capture language from request headers"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get language from header
        language = request.headers.get('X-Language', 'en')
        
        # Validate language
        if language not in ['en', 'fr', 'rw']:
            language = 'en'
        
        # Attach to request
        request.user_language = language
        
        response = self.get_response(request)
        response['X-Language'] = language
        
        return response