from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models.models import db
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, resources={r"/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }})
    
    # Configure database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quizzes.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    # Configure JWT
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    jwt = JWTManager(app)
    
    # Register blueprints
    from app.routes import pdf_routes, quiz_routes, user_routes
    app.register_blueprint(pdf_routes.bp)
    app.register_blueprint(quiz_routes.bp)
    app.register_blueprint(user_routes.bp)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=8001) 