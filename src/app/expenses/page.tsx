"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { Plus, Trash2, DollarSign, LogOut, ArrowLeft, PieChart, AlertCircle } from "lucide-react";
import { getUserCollection } from "@/lib/dbHelper";

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const expenseCategories = [
    "Rent", "Salary", "Utilities", "Transport", "Marketing", 
    "Office Supplies", "Maintenance", "Insurance", "Taxes", "Other"
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    setIsLoading(true);
    try {
      await addDoc(getUserCollection("expenses"), {
        category: category.trim(),
        amount: parseFloat(amount),
        description: description.trim() || "No description",
        timestamp: new Date(),
      });
      setCategory("");
      setAmount("");
      setDescription("");
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteDoc(doc(db, `users/${auth.currentUser?.uid}/expenses`, id));
        fetchExpenses();
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    const q = query(getUserCollection("expenses"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));
    setExpenses(data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Calculate statistics
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

  // Get category-wise totals
  const categoryTotals = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 
      'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600',
      'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600', 'bg-orange-100 text-orange-600',
      'bg-teal-100 text-teal-600', 'bg-gray-100 text-gray-600'
    ];
    const index = expenseCategories.indexOf(category) % colors.length;
    return colors[index] || 'bg-gray-100 text-gray-600';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        {/* Navbar */}
        <nav className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
                  <p className="text-sm text-gray-600">Track and manage your business expenses</p>
                </div>
              </div>
            </div>
            
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">₹{totalAmount.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Expense</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{averageExpense.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Expense Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-600" />
                  Add New Expense
                </h2>

                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-900 bg-white"
                      required
                    >
                      <option value="">Select a category</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-900 placeholder-gray-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Enter expense description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add Expense
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Expenses List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Expense History</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {expenses.length} expense records • Total: ₹{totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {expenses.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-red-600">₹{item.amount.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-48 truncate" title={item.description}>
                              {item.description}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {item.timestamp.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                              <br />
                              <span className="text-xs">
                                {item.timestamp.toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {expenses.length === 0 && (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No expenses recorded yet</p>
                      <p className="text-gray-400 text-sm mt-1">Add your first expense to get started</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Breakdown */}
              {Object.keys(categoryTotals).length > 0 && (
                <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-orange-600" />
                    Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryTotals)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([cat, total]) => (
                        <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(cat)}`}>
                            {cat}
                          </span>
                          <span className="font-semibold text-red-600">₹{(total as number).toFixed(2)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}