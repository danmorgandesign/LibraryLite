import { useState } from 'react';
import BooksPage from './pages/BooksPage';
import ClassesPage from './pages/ClassesPage';
import ClassLoansPage from './pages/ClassLoansPage';
import LandingPage from './pages/LandingPage';
import ManageClassPage from './pages/ManageClassPage';
import ScanBookPage from './pages/ScanBookPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';

type Page = 'landing' | 'scan' | 'books' | 'classes' | 'manage-class' | 'class-loans' | 'students' | 'student-detail';
type Classroom = { id: string; class_label: string };
type Student = { id: string; first_name: string; last_initial: string | null };

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentsFilterClassroomId, setStudentsFilterClassroomId] = useState<string | undefined>(undefined);

  const goToStudent = (student: Student) => {
    setSelectedStudent(student);
    setPage('student-detail');
  };

  const goToStudents = (classroomId?: string) => {
    setStudentsFilterClassroomId(classroomId);
    setPage('students');
  };

  if (page === 'scan') {
    return <ScanBookPage onClose={() => setPage('landing')} />;
  }

  if (page === 'books') {
    return (
      <BooksPage
        onScan={() => setPage('scan')}
        onClassesClick={() => setPage('classes')}
        onStudentsClick={() => goToStudents()}
        onStudentClick={goToStudent}
      />
    );
  }

  if (page === 'classes') {
    return (
      <ClassesPage
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onStudentsClick={() => goToStudents()}
        onClassClick={(classroom) => goToStudents(classroom.id)}
        onManageClass={(classroom) => {
          setSelectedClassroom(classroom);
          setPage('manage-class');
        }}
        onViewLoans={(classroom) => {
          setSelectedClassroom(classroom);
          setPage('class-loans');
        }}
      />
    );
  }

  if (page === 'manage-class' && selectedClassroom) {
    return (
      <ManageClassPage
        classroomId={selectedClassroom.id}
        classroomLabel={selectedClassroom.class_label}
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onClassesClick={() => setPage('classes')}
        onStudentsClick={() => goToStudents()}
        onStudentClick={goToStudent}
        onBack={() => setPage('classes')}
      />
    );
  }

  if (page === 'class-loans' && selectedClassroom) {
    return (
      <ClassLoansPage
        classroomId={selectedClassroom.id}
        classroomLabel={selectedClassroom.class_label}
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onClassesClick={() => setPage('classes')}
        onStudentsClick={() => goToStudents()}
        onStudentClick={goToStudent}
        onBack={() => setPage('classes')}
      />
    );
  }

  if (page === 'students') {
    return (
      <StudentsPage
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onClassesClick={() => setPage('classes')}
        onStudentClick={goToStudent}
        initialClassroomId={studentsFilterClassroomId}
      />
    );
  }

  if (page === 'student-detail' && selectedStudent) {
    return (
      <StudentDetailPage
        student={selectedStudent}
        onScan={() => setPage('scan')}
        onBooksClick={() => setPage('books')}
        onClassesClick={() => setPage('classes')}
        onBack={() => goToStudents()}
      />
    );
  }

  return (
    <LandingPage
      onScan={() => setPage('scan')}
      onBooksClick={() => setPage('books')}
      onClassesClick={() => setPage('classes')}
      onStudentsClick={() => goToStudents()}
    />
  );
}
