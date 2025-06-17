from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import db, User, UserApiKey
import base64

api_keys_bp = Blueprint('api_keys', __name__)

@api_keys_bp.route('/api-keys', methods=['GET'])
@jwt_required()
def get_user_api_keys():
    """Ottieni tutte le chiavi API dell'utente"""
    try:
        user_id = get_jwt_identity()
        api_keys = UserApiKey.query.filter_by(user_id=int(user_id), is_active=True).all()
        
        return jsonify({
            'success': True,
            'api_keys': [key.to_dict() for key in api_keys]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_keys_bp.route('/api-keys', methods=['POST'])
@jwt_required()
def add_api_key():
    """Aggiungi una nuova chiave API"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        provider = data.get('provider', '').strip()
        api_key = data.get('api_key', '').strip()
        
        if not provider or not api_key:
            return jsonify({'error': 'Provider e chiave API sono obbligatori'}), 400
        
        # Verifica se esiste già una chiave per questo provider
        existing_key = UserApiKey.query.filter_by(
            user_id=int(user_id), 
            provider=provider, 
            is_active=True
        ).first()
        
        if existing_key:
            # Aggiorna la chiave esistente
            existing_key.api_key = base64.b64encode(api_key.encode()).decode()
            existing_key.updated_at = db.func.now()
        else:
            # Crea una nuova chiave
            new_key = UserApiKey(
                user_id=int(user_id),
                provider=provider,
                api_key=base64.b64encode(api_key.encode()).decode()
            )
            db.session.add(new_key)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Chiave API per {provider} salvata con successo'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_keys_bp.route('/api-keys/<int:key_id>', methods=['DELETE'])
@jwt_required()
def delete_api_key(key_id):
    """Elimina una chiave API"""
    try:
        user_id = get_jwt_identity()
        
        api_key = UserApiKey.query.filter_by(
            id=key_id, 
            user_id=int(user_id)
        ).first()
        
        if not api_key:
            return jsonify({'error': 'Chiave API non trovata'}), 404
        
        api_key.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Chiave API eliminata con successo'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def get_user_api_key(user_id, provider):
    """Funzione helper per ottenere la chiave API di un utente per un provider specifico"""
    api_key_record = UserApiKey.query.filter_by(
        user_id=user_id, 
        provider=provider, 
        is_active=True
    ).first()
    
    if api_key_record:
        return base64.b64decode(api_key_record.api_key.encode()).decode()
    return None

