"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, TrendingUp, LogOut, ArrowLeft, IndianRupee, Users, CreditCard, Smartphone, Search, Calendar, Package } from "lucide-react";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [customer, setCustomer] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [stockWarningData, setStockWarningData] = useState({ product: "", available: 0, requested: 0 });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Fetch stocks for search functionality
  const fetchStocks = async () => {
    try {
      const q = query(collection(db, "stocks"), orderBy("product", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data()
      }));
      setStocks(data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  };

  // Search products with debouncing
  const handleProductSearch = (searchTerm: string) => {
    setProduct(searchTerm);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedStock(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const filtered = stocks.filter(stock =>
        stock.product.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
  };

  // Select product from dropdown
  const handleSelectProduct = (stock: any) => {
    setProduct(stock.product);
    setActualPrice(stock.costPrice.toString());
    setSelectedStock(stock);
    setShowDropdown(false);
  };

  // Check stock availability before sale
  const checkStockAvailability = () => {
    if (!selectedStock || !quantity) return true;

    const requestedQty = parseFloat(quantity);
    const availableQty = selectedStock.quantity;

    if (requestedQty > availableQty) {
      setStockWarningData({
        product: selectedStock.product,
        available: availableQty,
        requested: requestedQty
      });
      setShowStockWarning(true);
      return false;
    }
    return true;
  };

  // Update stock quantity after sale
  const updateStockQuantity = async (stockId: string, soldQuantity: number) => {
    try {
      const stockRef = doc(db, "stocks", stockId);
      const stock = stocks.find(s => s.id === stockId);
      
      if (stock) {
        const newQuantity = stock.quantity - soldQuantity;
        await updateDoc(stockRef, {
          quantity: newQuantity
        });
        // Refresh stocks data
        fetchStocks();
      }
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  // Add sale record
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !quantity || !actualPrice || !soldPrice) return;

    // Check stock availability
    if (!checkStockAvailability()) {
      return;
    }

    setIsLoading(true);
    const profit = (parseFloat(soldPrice) - parseFloat(actualPrice)) * parseFloat(quantity);

    try {
      // Create timestamp from selected date
      const saleTimestamp = new Date(saleDate);
      saleTimestamp.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

      await addDoc(collection(db, "sales"), {
        product: product.trim(),
        quantity: parseFloat(quantity),
        actualPrice: parseFloat(actualPrice),
        soldPrice: parseFloat(soldPrice),
        paymentMode,
        customer: customer.trim() || "Walk-in Customer",
        profit,
        timestamp: saleTimestamp,
      });

      // Update stock quantity if product is from stock
      if (selectedStock) {
        await updateStockQuantity(selectedStock.id, parseFloat(quantity));
      }

      // Reset form
      setProduct("");
      setQuantity("");
      setActualPrice("");
      setSoldPrice("");
      setCustomer("");
      setSelectedStock(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
      fetchSales();
    } catch (error) {
      console.error("Error adding sale:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sale with insufficient stock
  const handleProceedWithSale = async () => {
    setShowStockWarning(false);
    setIsLoading(true);
    const profit = (parseFloat(soldPrice) - parseFloat(actualPrice)) * parseFloat(quantity);

    try {
      const saleTimestamp = new Date(saleDate);
      saleTimestamp.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

      await addDoc(collection(db, "sales"), {
        product: product.trim(),
        quantity: parseFloat(quantity),
        actualPrice: parseFloat(actualPrice),
        soldPrice: parseFloat(soldPrice),
        paymentMode,
        customer: customer.trim() || "Walk-in Customer",
        profit,
        timestamp: saleTimestamp,
      });

      // Update stock to zero if selling more than available
      if (selectedStock) {
        const stockRef = doc(db, "stocks", selectedStock.id);
        await updateDoc(stockRef, {
          quantity: 0
        });
        fetchStocks();
      }

      // Reset form
      setProduct("");
      setQuantity("");
      setActualPrice("");
      setSoldPrice("");
      setCustomer("");
      setSelectedStock(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
      fetchSales();
    } catch (error) {
      console.error("Error adding sale:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete sale record
  const handleDeleteSale = async (id: string) => {
    if (confirm("Are you sure you want to delete this sale record?")) {
      try {
        await deleteDoc(doc(db, "sales", id));
        fetchSales();
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  // Fetch sales
  const fetchSales = async () => {
    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));
    setSales(data);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSales();
    fetchStocks();
  }, []);

  // Calculate statistics
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, item) => sum + (item.quantity * item.soldPrice), 0);
  const totalProfit = sales.reduce((sum, item) => sum + item.profit, 0);
  const totalQuantity = sales.reduce((sum, item) => sum + item.quantity, 0);

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case "Cash": return <IndianRupee size={16} />;
      case "Card": return <CreditCard size={16} />;
      case "UPI": return <Smartphone size={16} />;
      default: return <IndianRupee size={16} />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
                  <p className="text-sm text-gray-600">Track your sales and profits</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalSales}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className={`text-3xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{totalProfit.toFixed(2)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-6 h-6 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Sold</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalQuantity}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Sale Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Record New Sale
                </h2>

                <form onSubmit={handleAddSale} className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white"
                        required
                      />
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Product Search with Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search or enter product name"
                          value={product}
                          onChange={(e) => handleProductSearch(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500"
                          required
                        />
                        <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                      
                      {/* Search Dropdown */}
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((stock) => (
                            <div
                              key={stock.id}
                              onClick={() => handleSelectProduct(stock)}
                              className="flex items-center justify-between p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{stock.product}</div>
                                <div className="text-sm text-gray-500">
                                  Available: {stock.quantity} {stock.unit} • ₹{stock.costPrice}/unit
                                </div>
                              </div>
                              <Package className="h-4 w-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Stock Info */}
                    {selectedStock && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 font-medium">Stock Info:</span>
                          <span className="text-blue-600">
                            {selectedStock.quantity} {selectedStock.unit} available
                          </span>
                        </div>
                      </div>
                    )}
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
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Price
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={actualPrice}
                        onChange={(e) => setActualPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={soldPrice}
                        onChange={(e) => setSoldPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Customer name or number"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Record Sale
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sales Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Sales History</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {sales.length} sales records
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Qty</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cost</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sold</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Profit</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Payment</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sales.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.product}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{item.quantity}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">₹{item.actualPrice}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-green-600">₹{item.soldPrice}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{item.profit.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getPaymentIcon(item.paymentMode)}
                              {item.paymentMode}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-24 truncate" title={item.customer}>
                              {item.customer}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {item.timestamp.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
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
                              onClick={() => handleDeleteSale(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete sale record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {sales.length === 0 && (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No sales records yet</p>
                      <p className="text-gray-400 text-sm mt-1">Record your first sale to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Warning Modal */}
        {showStockWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Insufficient Stock</h3>
                  <p className="text-sm text-gray-600">Stock availability warning</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 text-sm">
                  Only <strong>{stockWarningData.available}</strong> units of <strong>"{stockWarningData.product}"</strong> available in stock, but you're trying to sell <strong>{stockWarningData.requested}</strong> units.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStockWarning(false)}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedWithSale}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    "Proceed Anyway"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}//hocus pocus fuck you