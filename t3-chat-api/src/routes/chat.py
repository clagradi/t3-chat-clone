from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
import json
from datetime import datetime
from src.models.user import db, User, ChatSession, ChatMessage, Attachment
from src.services.ai_service import AIService

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/chat/send', methods=['POST'])
@jwt_required()
def send_message():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        message = data.get('message', '').strip()
        model = data.get('model', 'Gemini 2.5 Flash')
        session_id = data.get('session_id')
        attachment_ids = data.get('attachment_ids', [])
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get attachments if provided
        attachments = []
        if attachment_ids:
            attachments = Attachment.query.filter(
                Attachment.id.in_(attachment_ids),
                Attachment.user_id == int(user_id)
            ).all()
        
        # Create or get session
        if session_id:
            session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
            if not session:
                return jsonify({'error': 'Session not found'}), 404
        else:
            # Create new session
            session_id = str(uuid.uuid4())
            session = ChatSession(
                id=session_id,
                user_id=user_id,
                title=message[:50] + '...' if len(message) > 50 else message
            )
            db.session.add(session)
        
        # Add user message
        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            text=message,
            sender='user',
            model=model
        )
        db.session.add(user_message)
        
        # Generate AI response using real APIs with attachments
        ai_response_text = AIService.get_ai_response(int(user_id), model, message, attachments)
        
        ai_message = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            text=ai_response_text,
            sender='ai',
            model=model
        )
        db.session.add(ai_message)
        
        # Update session timestamp
        session.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'user_message': user_message.to_dict(),
            'ai_message': ai_message.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/sessions', methods=['GET'])
@jwt_required()
def get_chat_sessions():
    try:
        user_id = get_jwt_identity()
        sessions = ChatSession.query.filter_by(user_id=int(user_id)).order_by(ChatSession.updated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/messages/<session_id>', methods=['GET'])
@jwt_required()
def get_messages(session_id):
    try:
        user_id = get_jwt_identity()
        
        # Verify session belongs to user
        session = ChatSession.query.filter_by(id=session_id, user_id=int(user_id)).first()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.created_at.asc()).all()
        
        return jsonify({
            'success': True,
            'messages': [message.to_dict() for message in messages]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/new', methods=['POST'])
@jwt_required()
def new_chat():
    try:
        user_id = get_jwt_identity()
        session_id = str(uuid.uuid4())
        
        session = ChatSession(
            id=session_id,
            user_id=int(user_id),
            title='New Chat'
        )
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'session': session.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    try:
        user_id = get_jwt_identity()
        
        session = ChatSession.query.filter_by(id=session_id, user_id=int(user_id)).first()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        db.session.delete(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Session deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/models', methods=['GET'])
def get_models():
    try:
        models = [
            'Gemini 2.5 Flash',
            'GPT-4o',
            'Claude 3.5 Sonnet',
            'DeepSeek V3'
        ]
        return jsonify({
            'success': True,
            'models': models
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/chat/stream', methods=['POST'])
@jwt_required()
def stream_message():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        message = data.get('message', '').strip()
        model = data.get('model', 'Gemini 2.5 Flash')
        session_id = data.get('session_id')
        attachment_ids = data.get('attachment_ids', [])
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get attachments if provided
        attachments = []
        if attachment_ids:
            attachments = Attachment.query.filter(
                Attachment.id.in_(attachment_ids),
                Attachment.user_id == int(user_id)
            ).all()
        
        # Create or get session
        if session_id:
            session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
            if not session:
                return jsonify({'error': 'Session not found'}), 404
        else:
            # Create new session
            session_id = str(uuid.uuid4())
            session = ChatSession(
                id=session_id,
                user_id=user_id,
                title=message[:50] + '...' if len(message) > 50 else message
            )
            db.session.add(session)
        
        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            text=message,
            sender='user'
        )
        db.session.add(user_message)
        
        # Link attachments to message
        for attachment in attachments:
            attachment.message_id = user_message.id
        
        db.session.commit()
        
        def generate_stream():
            try:
                ai_service = AIService()
                
                # Get AI response with streaming
                full_response = ""
                for chunk in ai_service.get_streaming_response(message, model, user, attachments):
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save AI message
                ai_message = ChatMessage(
                    session_id=session_id,
                    text=full_response,
                    sender='ai'
                )
                db.session.add(ai_message)
                db.session.commit()
                
                # Send completion signal
                yield f"data: {json.dumps({'done': True, 'message_id': ai_message.id, 'session_id': session_id})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generate_stream(),
            mimetype='text/plain',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream'
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

