import React from 'react';
import { Clock, BookOpen, MapPin } from 'lucide-react';

const Timetable = () => {
  const timetable = {
    Monday: [
      { time: '08:00 - 09:00', subject: 'Mathematics', room: 'Rm 101', class: 'S5 Science' },
      { time: '09:00 - 10:00', subject: 'Physics', room: 'Lab 2', class: 'S5 Science' },
      { time: '10:00 - 10:30', subject: 'Break', room: '-', class: '-' },
      { time: '10:30 - 11:30', subject: 'Chemistry', room: 'Lab 1', class: 'S5 Science' },
      { time: '11:30 - 12:30', subject: 'English', room: 'Rm 103', class: 'S5 Science' },
    ],
    Tuesday: [
      { time: '08:00 - 09:00', subject: 'Biology', room: 'Lab 3', class: 'S5 Science' },
      { time: '09:00 - 10:00', subject: 'Mathematics', room: 'Rm 101', class: 'S5 Science' },
      { time: '10:00 - 10:30', subject: 'Break', room: '-', class: '-' },
      { time: '10:30 - 11:30', subject: 'History', room: 'Rm 105', class: 'S5 Science' },
      { time: '11:30 - 12:30', subject: 'Geography', room: 'Rm 106', class: 'S5 Science' },
    ],
    Wednesday: [
      { time: '08:00 - 09:00', subject: 'Kinyarwanda', room: 'Rm 102', class: 'S5 Science' },
      { time: '09:00 - 10:00', subject: 'Mathematics', room: 'Rm 101', class: 'S5 Science' },
      { time: '10:00 - 10:30', subject: 'Break', room: '-', class: '-' },
      { time: '10:30 - 11:30', subject: 'Physics', room: 'Lab 2', class: 'S5 Science' },
      { time: '11:30 - 12:30', subject: 'Chemistry', room: 'Lab 1', class: 'S5 Science' },
    ],
    Thursday: [
      { time: '08:00 - 09:00', subject: 'English', room: 'Rm 103', class: 'S5 Science' },
      { time: '09:00 - 10:00', subject: 'Biology', room: 'Lab 3', class: 'S5 Science' },
      { time: '10:00 - 10:30', subject: 'Break', room: '-', class: '-' },
      { time: '10:30 - 11:30', subject: 'Mathematics', room: 'Rm 101', class: 'S5 Science' },
      { time: '11:30 - 12:30', subject: 'Geography', room: 'Rm 106', class: 'S5 Science' },
    ],
    Friday: [
      { time: '08:00 - 09:00', subject: 'History', room: 'Rm 105', class: 'S5 Science' },
      { time: '09:00 - 10:00', subject: 'Kinyarwanda', room: 'Rm 102', class: 'S5 Science' },
      { time: '10:00 - 10:30', subject: 'Break', room: '-', class: '-' },
      { time: '10:30 - 11:30', subject: 'Sports', room: 'Field', class: 'S5 Science' },
      { time: '11:30 - 12:30', subject: 'Study Hall', room: 'Lib', class: 'S5 Science' },
    ]
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Timetable</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Weekly class schedule</p>
        </div>
        <div className="text-sm text-gray-500">
          Week of: January 15, 2024
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-4">
            {/* Time Column */}
            <div className="card p-3">
              <div className="font-semibold text-center mb-4">Time</div>
              {['08:00', '09:00', '10:30', '11:30'].map((time, idx) => (
                <div key={idx} className="h-24 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                  {time}
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {days.map((day) => (
              <div key={day} className="card p-3">
                <div className="font-semibold text-center mb-4">{day}</div>
                {timetable[day].filter(s => s.time !== '10:00 - 10:30').map((slot, idx) => (
                  <div key={idx} className="h-24 mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {slot.subject !== 'Break' ? (
                      <>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <BookOpen className="w-3 h-3" />
                          {slot.subject}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          {slot.room}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{slot.class}</div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-warning text-sm">
                        ☕ Break
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Today's Schedule</h2>
        <div className="space-y-3">
          {timetable.Monday.map((slot, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium">{slot.time}</span>
              </div>
              <div className="flex-1 ml-4">
                <p className="font-medium">{slot.subject}</p>
                <p className="text-xs text-gray-500">{slot.room} • {slot.class}</p>
              </div>
              {slot.subject !== 'Break' && (
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  Mark Attendance
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timetable;