"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, Package, LogOut, ArrowLeft, Edit, Save, X } from "lucide-react";
import { getUserCollection } from "@/lib/dbHelper";

export default function StocksPage() {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [costPrice, setCostPrice] = useState("");
  const [stocks, setStocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ product: "", quantity: "", unit: "pcs", costPrice: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stockToDelete, setStockToDelete] = useState<any>(null);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Add stock item
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !quantity || !costPrice) return;

    setIsLoading(true);
    try {
      await addDoc(await getUserCollection("stocks"), {
        product: product.trim(),
        quantity: parseFloat(quantity),
        unit,
        costPrice: parseFloat(costPrice),
        timestamp: new Date(),
      });
      setProduct("");
      setQuantity("");
      setCostPrice("");
      fetchStocks();
    } catch (error) {
      console.error("Error adding stock:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (stock: any) => {
    setStockToDelete(stock);
    setShowDeleteConfirm(true);
  };

  // Delete stock item
  const handleDeleteStock = async () => {
    if (!stockToDelete) return;

    try {
      await deleteDoc(doc(db, `users/${auth.currentUser?.uid}/stocks`, stockToDelete.id));
      fetchStocks();
      setShowDeleteConfirm(false);
      setStockToDelete(null);
    } catch (error) {
      console.error("Error deleting stock:", error);
    }
  };

  // Start editing a stock item
  const handleEditStock = (stock: any) => {
    setEditingId(stock.id);
    setEditForm({
      product: stock.product,
      quantity: stock.quantity.toString(),
      unit: stock.unit,
      costPrice: stock.costPrice.toString()
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ product: "", quantity: "", unit: "pcs", costPrice: "" });
  };

  // Update stock item
  const handleUpdateStock = async (id: string) => {
    if (!editForm.product || !editForm.quantity || !editForm.costPrice) return;

    try {
      const stockRef = doc(db, `users/${auth.currentUser?.uid}/stocks`, id);
      await updateDoc(stockRef, {
        product: editForm.product.trim(),
        quantity: parseFloat(editForm.quantity),
        unit: editForm.unit,
        costPrice: parseFloat(editForm.costPrice),
      });
      
      setEditingId(null);
      setEditForm({ product: "", quantity: "", unit: "pcs", costPrice: "" });
      fetchStocks();
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  // Fetch stock items
  const fetchStocks = async () => {
    const snapshot = await getDocs(await getUserCollection("stocks"));
    const data = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));
    // Sort by timestamp descending
    data.sort((a, b) => b.timestamp - a.timestamp);
    setStocks(data);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const totalValue = stocks.reduce((sum, item) => 
    sum + (item.quantity * item.costPrice), 0
  );
  const totalItems = stocks.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
                  <p className="text-sm text-gray-600">Manage your inventory and products</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stocks.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalItems}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalValue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Stock Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  Add New Stock
                </h2>

                <form onSubmit={handleAddStock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter product name"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="meters">Meters</option>
                        <option value="kg">Kilograms</option>
                        <option value="liters">Liters</option>
                        <option value="boxes">Boxes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Price (per unit)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add to Stock
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Stock List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Stock Inventory</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {stocks.length} products in inventory
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Quantity</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Unit Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Value</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Added Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stocks.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            {editingId === item.id ? (
                              <input
                                type="text"
                                value={editForm.product}
                                onChange={(e) => setEditForm({...editForm, product: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">{item.product}</div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4">
                            {editingId === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                                  className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                  min="0"
                                  step="0.01"
                                />
                                <select
                                  value={editForm.unit}
                                  onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
                                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                >
                                  <option value="pcs">pcs</option>
                                  <option value="meters">meters</option>
                                  <option value="kg">kg</option>
                                  <option value="liters">liters</option>
                                  <option value="boxes">boxes</option>
                                </select>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900">
                                {item.quantity} {item.unit}
                              </div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                value={editForm.costPrice}
                                onChange={(e) => setEditForm({...editForm, costPrice: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">₹{item.costPrice}</div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-blue-600">
                              ₹{(item.quantity * item.costPrice).toFixed(2)}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {item.timestamp.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {editingId === item.id ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStock(item.id)}
                                    className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Save changes"
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                                    title="Cancel editing"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditStock(item)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit item"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => showDeleteConfirmation(item)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {stocks.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No stock items yet</p>
                      <p className="text-gray-400 text-sm mt-1">Add your first stock item to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && stockToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Stock Item</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <p className="text-gray-800 text-sm mb-3">
                  Are you sure you want to delete <strong>"{stockToDelete.product}"</strong> from your stock?
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Quantity: {stockToDelete.quantity} {stockToDelete.unit}</p>
                  <p>• Unit Price: ₹{stockToDelete.costPrice}</p>
                  <p>• Total Value: ₹{(stockToDelete.quantity * stockToDelete.costPrice).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setStockToDelete(null);
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStock}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}