import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Search, Filter, CheckCircle, Clock, AlertCircle, TrendingUp, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const FeeManagement = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [students, setStudents] = useState([
    { id: 1, name: 'John Doe', class: 'S5 Science', registration: '2024-001', feeStatus: 'paid', amount: 150000, paidDate: '2024-01-10' },
    { id: 2, name: 'Jane Smith', class: 'S5 Science', registration: '2024-002', feeStatus: 'partial', amount: 150000, paidAmount: 75000, paidDate: '2024-01-05' },
    { id: 3, name: 'Peter Gitonga', class: 'S4 Arts', registration: '2024-003', feeStatus: 'unpaid', amount: 150000, paidAmount: 0, paidDate: null },
    { id: 4, name: 'Alice Uwase', class: 'S4 Science', registration: '2024-004', feeStatus: 'paid', amount: 150000, paidDate: '2024-01-08' },
    { id: 5, name: 'Eric Niyonshuti', class: 'S3 Science', registration: '2024-005', feeStatus: 'partial', amount: 150000, paidAmount: 50000, paidDate: '2024-01-12' },
    { id: 6, name: 'Grace Mukamana', class: 'S5 Arts', registration: '2024-006', feeStatus: 'unpaid', amount: 150000, paidAmount: 0, paidDate: null },
  ]);

  const stats = {
    totalStudents: students.length,
    fullyPaid: students.filter(s => s.feeStatus === 'paid').length,
    partiallyPaid: students.filter(s => s.feeStatus === 'partial').length,
    unpaid: students.filter(s => s.feeStatus === 'unpaid').length,
    totalCollected: students.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
    expectedTotal: students.reduce((sum, s) => sum + s.amount, 0),
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.registration.includes(searchTerm);
    const matchesStatus = selectedStatus === 'all' || student.feeStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const updateFeeStatus = (studentId, newStatus, paidAmount = null) => {
    setStudents(students.map(student => {
      if (student.id === studentId) {
        const updates = { feeStatus: newStatus };
        if (paidAmount !== null) updates.paidAmount = paidAmount;
        if (newStatus === 'paid') updates.paidDate = new Date().toISOString().split('T')[0];
        toast.success(`Fee status updated to ${newStatus} for ${student.name}`);
        return { ...student, ...updates };
      }
      return student;
    }));
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Fully Paid</span>;
      case 'partial':
        return <span className="px-2 py-1 rounded-full text-xs bg-warning/10 text-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Partially Paid</span>;
      case 'unpaid':
        return <span className="px-2 py-1 rounded-full text-xs bg-danger/10 text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Unpaid</span>;
      default:
        return null;
    }
  };

  const collectionRate = ((stats.totalCollected / stats.expectedTotal) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage student fee payments and report access</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
          <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Fully Paid</p>
          <p className="text-2xl font-bold text-success mt-1">{stats.fullyPaid}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Partially Paid</p>
          <p className="text-2xl font-bold text-warning mt-1">{stats.partiallyPaid}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid</p>
          <p className="text-2xl font-bold text-danger mt-1">{stats.unpaid}</p>
        </div>
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <p className="text-sm opacity-90">Collection Rate</p>
          <p className="text-2xl font-bold mt-1">{collectionRate}%</p>
          <TrendingUp className="w-4 h-4 mt-2 opacity-80" />
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">Reg No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Student Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Class</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Total Fees</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Paid Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => {
                const balance = student.amount - (student.paidAmount || 0);
                return (
                  <tr key={student.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.registration}</td>
                    <td className="px-4 py-3 text-sm font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.class}</td>
                    <td className="px-4 py-3 text-sm">RWF {student.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">RWF {(student.paidAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-danger">RWF {balance.toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(student.feeStatus)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={student.feeStatus}
                        onChange={(e) => updateFeeStatus(student.id, e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                      >
                        <option value="unpaid">Mark Unpaid</option>
                        <option value="partial">Mark Partial</option>
                        <option value="paid">Mark Paid</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Access Note */}
      <div className="card bg-info/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-info mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Report Access Policy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Only students with "Fully Paid" fee status can view their academic reports. 
              This restriction helps ensure timely fee collection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeManagement;