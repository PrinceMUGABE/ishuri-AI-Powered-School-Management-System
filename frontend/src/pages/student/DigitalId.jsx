import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, CreditCard, User, Hash, Calendar, GraduationCap } from 'lucide-react';

const DigitalID = () => {
  const { t } = useTranslation();

  const studentInfo = {
    name: 'John Doe',
    registrationNumber: '2024-00123',
    class: 'Senior 5 - Science',
    validUntil: '2025-12-31',
    photoUrl: 'https://via.placeholder.com/150',
    bloodGroup: 'O+',
    parentName: 'Jane Doe',
    contact: '+250 788 123 456'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('digitalId.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Your official digital student identification card</p>
      </div>

      {/* Digital ID Card */}
      <div className="flex justify-center">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="p-6 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">Ishuri</h2>
                  <p className="text-xs opacity-80">Student ID Card</p>
                </div>
                <CreditCard className="w-8 h-8 opacity-80" />
              </div>
              
              {/* Student Photo & Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  <span className="text-3xl">🎓</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{studentInfo.name}</h3>
                  <p className="text-sm opacity-80">{studentInfo.class}</p>
                </div>
              </div>
              
              {/* Details Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Hash className="w-4 h-4 opacity-80" />
                  <span className="opacity-80">Reg No:</span>
                  <span className="font-mono">{studentInfo.registrationNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 opacity-80" />
                  <span className="opacity-80">Parent:</span>
                  <span>{studentInfo.parentName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="w-4 h-4 opacity-80" />
                  <span className="opacity-80">Blood Group:</span>
                  <span>{studentInfo.bloodGroup}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span className="opacity-80">Valid Until:</span>
                  <span>{studentInfo.validUntil}</span>
                </div>
              </div>
            </div>
            
            {/* Card Footer */}
            <div className="bg-black/20 p-4 text-center">
              <p className="text-xs text-white/70">This is an official digital ID card issued by Les Hirondelles de Don Bosco - Ndera</p>
            </div>
          </div>
          
          {/* Download Button */}
          <div className="mt-6 flex justify-center">
            <button className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Digital ID Card
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="font-semibold mb-2">How to use your Digital ID Card</h3>
        <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
          <li>• Your digital ID card can be displayed on your phone or printed</li>
          <li>• It serves as official identification within the school premises</li>
          <li>• Keep your digital ID card accessible for verification when needed</li>
          <li>• Report any unauthorized use to the administration immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default DigitalID;