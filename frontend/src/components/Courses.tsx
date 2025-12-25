import React, { useState, useEffect } from 'react';
import api from "../api";

const Courses: React.FC = () => {
    const [courses, setCourses] = useState([]);

    const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error("Error fetching courses", error);
    }
  };

    useEffect(() => {
    fetchCourses();
  }, []);
    
    return (
    <div>
      <h2>Course List</h2>
      <ul>
        {courses.map((course, index) => (
          <li key={index}>{course}</li>
        ))}
      </ul>
    </div>
  );
};

export default Courses;