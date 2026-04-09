import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import transcript_service 

import quiz_service #yapay zeka için 

from models import db,Quiz
app = Flask(__name__)


#Veritabanı işlemleri
basedir=os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///'+os.path.join(basedir,'quiz.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False  

#veritabanını başlat
db.init_app(app)

#veritabanı tablolarını  ilk kez oluştur
with app.app_context():
    db.create_all()


@app.route('/generate_quiz',methods=['POST'])
def generate_quiz():
    """
    Eğitmenin girdiği konuyu alır, quiz_service'e gönderir 
    ve üretilen soruyu JSON olarak döner.
    """
    data=request.get_json()
    #veri kontrolu
    if not data or 'topic' not in data:
        return jsonify({'error':'Lütfen "topic" parametresi gönderin'}),400
    topic=data.get('topic')
    difficulty=data.get('difficult','Orta') #varsayılan

    result = quiz_service.generate_quiz_question(topic, difficulty)

    
    if result['success']:
        try:
        #2. üretilen soruyu veritabanına ekle
            new_quiz=Quiz(
                topic=topic,
                difficulty=difficulty,
                question_text=result['quiz']['soru'],
                options=result['quiz']['secenekler'],
                correct_answer=result['quiz']['cevap']
            
            )
            db.session.add(new_quiz)
            db.session.commit()

            #veritabanı ID sini de sonuca ekleyip döndürme 
            result['db_id']=new_quiz.id
            return jsonify(result),200
        except Exception as e:
            db.session.rollback() #hata olursa işlemi geri al
            return jsonify({'error': f'Veritabanı kayıt hatası: {str(e)}'}),500
    else:
        return jsonify(result),500


    
@app.route('/quizzes',methods=['GET'])
def get_quizzes():
    #tüm quizleri tarihe göre tersten al
    quizzes=Quiz.query.order_by(Quiz.created_at.desc()).all()
    return jsonify({
        "success":True,
        "count":len(quizzes),
        "data":[q.to_dict() for q in quizzes]
    })


if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)