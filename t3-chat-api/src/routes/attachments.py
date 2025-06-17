from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from src.models.user import db, User, Attachment, ChatMessage
import os
import uuid
from datetime import datetime

attachments_bp = Blueprint('attachments', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'md', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@attachments_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """Upload a file attachment"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400

        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Save file
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        mime_type = file.content_type or 'application/octet-stream'
        
        # Create attachment record (without message_id for now)
        attachment = Attachment(
            filename=unique_filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            message_id=0,  # Will be updated when message is created
            user_id=int(user_id)
        )
        
        db.session.add(attachment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'attachment': attachment.to_dict()
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'error': 'Upload failed'}), 500

@attachments_bp.route('/<int:attachment_id>', methods=['GET'])
@jwt_required()
def get_attachment(attachment_id):
    """Download/view an attachment"""
    try:
        user_id = get_jwt_identity()
        
        attachment = Attachment.query.filter_by(
            id=attachment_id,
            user_id=int(user_id)
        ).first()
        
        if not attachment:
            return jsonify({'error': 'Attachment not found'}), 404
            
        if not os.path.exists(attachment.file_path):
            return jsonify({'error': 'File not found on disk'}), 404
            
        return send_file(
            attachment.file_path,
            as_attachment=False,
            download_name=attachment.original_filename,
            mimetype=attachment.mime_type
        )
        
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({'error': 'Download failed'}), 500

@attachments_bp.route('/<int:attachment_id>', methods=['DELETE'])
@jwt_required()
def delete_attachment(attachment_id):
    """Delete an attachment"""
    try:
        user_id = get_jwt_identity()
        
        attachment = Attachment.query.filter_by(
            id=attachment_id,
            user_id=int(user_id)
        ).first()
        
        if not attachment:
            return jsonify({'error': 'Attachment not found'}), 404
            
        # Delete file from disk
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
            
        # Delete from database
        db.session.delete(attachment)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({'error': 'Delete failed'}), 500

@attachments_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user_attachments():
    """Get all attachments for the current user"""
    try:
        user_id = get_jwt_identity()
        
        attachments = Attachment.query.filter_by(user_id=int(user_id)).order_by(
            Attachment.created_at.desc()
        ).all()
        
        return jsonify({
            'attachments': [att.to_dict() for att in attachments]
        })
        
    except Exception as e:
        print(f"Get attachments error: {e}")
        return jsonify({'error': 'Failed to get attachments'}), 500

