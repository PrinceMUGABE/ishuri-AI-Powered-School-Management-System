from functools import wraps
from typing import Dict, Any, Optional, Callable
import logging
import traceback
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import DatabaseError, IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound, AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from accounts.translations.translator import translator

logger = logging.getLogger(__name__)


def api_endpoint(func: Callable) -> Callable:
    """
    Decorator to wrap API endpoints with comprehensive error handling
    and standardized response formatting.
    """
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        # Get language from request
        lang_code = request.headers.get('Accept-Language', 'en')
        if lang_code not in ['en', 'fr', 'rw']:
            lang_code = 'en'
        
        # Add translator and language to request for easy access
        request.translator = translator
        request.lang_code = lang_code
        
        try:
            # Execute the actual view function
            response = func(self, request, *args, **kwargs)
            
            # If response is already a Response object, return it
            if isinstance(response, Response):
                return response
            
            # If response is a dict, format as success response
            if isinstance(response, dict):
                return Response({
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang_code,
                    **response
                }, status=status.HTTP_200_OK)
            
            # If response is a tuple (data, http_status)
            if isinstance(response, tuple) and len(response) == 2:
                data, http_status = response
                return Response({
                    'success': True,
                    'status_code': http_status,
                    'language': lang_code,
                    **data
                }, status=http_status)
            
            # Default response
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang_code,
                'data': response
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return _handle_validation_error(e, lang_code)
        except PermissionDenied as e:
            return _handle_permission_error(e, lang_code)
        except NotFound as e:
            return _handle_not_found_error(e, lang_code)
        except AuthenticationFailed as e:
            return _handle_authentication_error(e, lang_code)
        except (InvalidToken, TokenError) as e:
            return _handle_token_error(e, lang_code)
        except IntegrityError as e:
            return _handle_integrity_error(e, lang_code)
        except DatabaseError as e:
            return _handle_database_error(e, lang_code)
        except DjangoValidationError as e:
            return _handle_django_validation_error(e, lang_code)
        except Exception as e:
            return _handle_unexpected_error(e, lang_code)
    
    return wrapper


def _handle_validation_error(error: ValidationError, lang_code: str) -> Response:
    """Handle DRF validation errors."""
    error_messages = {}
    
    if hasattr(error, 'detail'):
        if isinstance(error.detail, dict):
            for field, messages in error.detail.items():
                if messages:
                    error_messages[field] = [
                        str(msg) if isinstance(msg, str) else str(msg) 
                        for msg in messages
                    ]
        else:
            error_messages['non_field_errors'] = [str(error.detail)]
    
    return Response({
        'success': False,
        'status_code': status.HTTP_400_BAD_REQUEST,
        'language': lang_code,
        'error': {
            'type': 'validation_error',
            'message': translator.get_error_message('validation.required_field', lang_code, field='Input'),
            'details': error_messages
        }
    }, status=status.HTTP_400_BAD_REQUEST)


def _handle_permission_error(error: PermissionDenied, lang_code: str) -> Response:
    """Handle permission errors."""
    return Response({
        'success': False,
        'status_code': status.HTTP_403_FORBIDDEN,
        'language': lang_code,
        'error': {
            'type': 'permission_error',
            'message': translator.get_error_message('authentication.permission_denied', lang_code),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_403_FORBIDDEN)


def _handle_not_found_error(error: NotFound, lang_code: str) -> Response:
    """Handle not found errors."""
    return Response({
        'success': False,
        'status_code': status.HTTP_404_NOT_FOUND,
        'language': lang_code,
        'error': {
            'type': 'not_found_error',
            'message': translator.get_error_message('user_management.user_not_found', lang_code, user_id='requested'),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_404_NOT_FOUND)


def _handle_authentication_error(error: AuthenticationFailed, lang_code: str) -> Response:
    """Handle authentication errors."""
    return Response({
        'success': False,
        'status_code': status.HTTP_401_UNAUTHORIZED,
        'language': lang_code,
        'error': {
            'type': 'authentication_error',
            'message': translator.get_error_message('authentication.invalid_credentials', lang_code),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_401_UNAUTHORIZED)


def _handle_token_error(error: Exception, lang_code: str) -> Response:
    """Handle JWT token errors."""
    return Response({
        'success': False,
        'status_code': status.HTTP_401_UNAUTHORIZED,
        'language': lang_code,
        'error': {
            'type': 'token_error',
            'message': translator.get_error_message('authentication.token_invalid', lang_code),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_401_UNAUTHORIZED)


def _handle_integrity_error(error: IntegrityError, lang_code: str) -> Response:
    """Handle database integrity errors."""
    logger.error(f"IntegrityError: {str(error)}\n{traceback.format_exc()}")
    
    return Response({
        'success': False,
        'status_code': status.HTTP_400_BAD_REQUEST,
        'language': lang_code,
        'error': {
            'type': 'integrity_error',
            'message': translator.get_error_message('user_management.username_exists', lang_code, username='unknown'),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_400_BAD_REQUEST)


def _handle_database_error(error: DatabaseError, lang_code: str) -> Response:
    """Handle database errors."""
    logger.error(f"DatabaseError: {str(error)}\n{traceback.format_exc()}")
    
    return Response({
        'success': False,
        'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
        'language': lang_code,
        'error': {
            'type': 'database_error',
            'message': translator.get_error_message('system.database_error', lang_code),
            'details': None
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _handle_django_validation_error(error: DjangoValidationError, lang_code: str) -> Response:
    """Handle Django validation errors."""
    error_messages = {}
    
    if hasattr(error, 'message_dict'):
        error_messages = error.message_dict
    elif hasattr(error, 'messages'):
        error_messages['non_field_errors'] = list(error.messages)
    else:
        error_messages['non_field_errors'] = [str(error)]
    
    return Response({
        'success': False,
        'status_code': status.HTTP_400_BAD_REQUEST,
        'language': lang_code,
        'error': {
            'type': 'validation_error',
            'message': translator.get_error_message('validation.required_field', lang_code, field='Input'),
            'details': error_messages
        }
    }, status=status.HTTP_400_BAD_REQUEST)


def _handle_unexpected_error(error: Exception, lang_code: str) -> Response:
    """Handle unexpected errors."""
    logger.error(f"Unexpected error: {str(error)}\n{traceback.format_exc()}")
    
    return Response({
        'success': False,
        'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
        'language': lang_code,
        'error': {
            'type': 'internal_error',
            'message': translator.get_error_message('system.internal_error', lang_code),
            'details': str(error) if str(error) else None
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BaseAPIView(APIView):
    """Base class for all API views with common functionality."""
    
    def get_language(self, request) -> str:
        """Extract language from request headers."""
        lang_code = request.headers.get('Accept-Language', 'en')
        if lang_code not in ['en', 'fr', 'rw']:
            lang_code = 'en'
        return lang_code
    
    def get_translator(self, request):
        """Get translator instance with language."""
        lang_code = self.get_language(request)
        return translator, lang_code
    
    def success_response(self, message_key: str = None, data: Any = None, 
                        status_code: int = status.HTTP_200_OK, **kwargs) -> Response:
        """Create a standardized success response."""
        response_data = {
            'success': True,
            'status_code': status_code
        }
        
        if message_key:
            if hasattr(self, 'translator') and hasattr(self, 'lang_code'):
                message = self.translator.get_success_message(message_key, self.lang_code, **kwargs)
                response_data['message'] = message['message']
                response_data['message_key'] = message_key
        
        if data is not None:
            response_data['data'] = data
        
        return Response(response_data, status=status_code)
    
    def error_response(self, error_key: str, status_code: int = status.HTTP_400_BAD_REQUEST,
                      details: Dict = None, **kwargs) -> Response:
        """Create a standardized error response."""
        if hasattr(self, 'translator') and hasattr(self, 'lang_code'):
            error_msg = self.translator.get_error_message(error_key, self.lang_code, **kwargs)
        else:
            error_msg = {'message': error_key, 'error_key': error_key}
        
        response_data = {
            'success': False,
            'status_code': status_code,
            'error': {
                'type': error_key.split('.')[-1] if '.' in error_key else error_key,
                'message': error_msg['message'],
                'error_key': error_key
            }
        }
        
        if details:
            response_data['error']['details'] = details
        
        return Response(response_data, status=status_code)
    
    
    
    
    
    