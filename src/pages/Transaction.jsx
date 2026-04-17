import React, { useState, useEffect } from "react";
import { db, doc, setDoc, getDoc, updateDoc, arrayUnion } from "../firebase";
import {
  FaPlus,
  FaMinus,
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaChartLine,
  FaTrash,
  FaSearch,
  FaChevronDown
} from "react-icons/fa";

function Transaction({ user }) {
  const [totalAmount, setTotalAmount] = useState(0);
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeHover, setActiveHover] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stagedType, setStagedType] = useState(null);
  const [showStep2, setShowStep2] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDeleteIndex, setTransactionToDeleteIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const INCOME_CATEGORIES = ["Income-Allowance", "Rent Gain", "Gifts", "Other"];
  const EXPENSE_CATEGORIES = [
    "Other",
    "Housing",
    "Utilities",
    "Groceries",
    "Transportation",
    "Insurance",
    "Healthcare",
    "Minimum debt payments",
    "Childcare",
    "Dining out",
    "Entertainment",
    "Hobbies",
    "Clothing",
    "Travel/vacations",
    "Personal care",
    "Gifts/subscriptions",
    "Investments"
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.uid) {
        setError("User not authenticated or uid not available");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "transactions", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTotalAmount(data.totalAmount || 0);
          const validTransactions = (data.transactions || []).filter(t => t.date);
          setTransactions(validTransactions);
        } else {
          await setDoc(userDocRef, { totalAmount: 0, transactions: [] });
          setTotalAmount(0);
          setTransactions([]);
        }
      } catch (err) {
        setError("Failed to fetch data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddIncome = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    setError(null);
    setStagedType("Income");
    setShowStep2(true);
    setSelectedCategory("");
    setCustomCategoryName("");
  };

  const handleSubtractExpense = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > totalAmount) {
      setError("Please enter a valid amount less than or equal to current total");
      return;
    }
    setError(null);
    setStagedType("Expense");
    setShowStep2(true);
    setSelectedCategory("");
    setCustomCategoryName("");
  };

  const handleConfirmTransaction = async () => {
    if (!user || !user.uid) {
      setError("User not authenticated. Please sign in again.");
      return;
    }

    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }

    const finalCategory = selectedCategory === "Other" && customCategoryName 
      ? customCategoryName 
      : selectedCategory;

    try {
      setError(null);
      const userDocRef = doc(db, "transactions", user.uid);
      const amountNum = Number(amount);
      const newTotal = stagedType === "Income" ? totalAmount + amountNum : totalAmount - amountNum;
      const clientTimestamp = new Date().toISOString();

      const transaction = {
        type: stagedType,
        amount: amountNum,
        category: finalCategory,
        date: clientTimestamp,
        createdAt: clientTimestamp,
      };

      await updateDoc(userDocRef, {
        totalAmount: newTotal,
        transactions: arrayUnion(transaction)
      });

      setTotalAmount(newTotal);
      setTransactions((prev) => [...prev, transaction].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setAmount("");
      setSelectedCategory("");
      setStagedType(null);
      setShowStep2(false);
      setCustomCategoryName("");
    } catch (err) {
      console.error("Delete transaction error:", err);
      setError("Failed to delete transaction: " + err.message);
    }
  };

  const confirmDelete = async () => {
    if (transactionToDeleteIndex === null) return;

    try {
      setError(null);
      const index = transactionToDeleteIndex;
      const transactionToDelete = transactions[index];
      const userDocRef = doc(db, "transactions", user.uid);
      
      // Calculate new total
      const amountNum = Number(transactionToDelete.amount);
      const newTotal = transactionToDelete.type === "Income" 
        ? totalAmount - amountNum 
        : totalAmount + amountNum;

      // Filter out the transaction to delete
      const updatedTransactions = transactions.filter((_, i) => i !== index);

      await updateDoc(userDocRef, {
        totalAmount: newTotal,
        transactions: updatedTransactions
      });

      setTotalAmount(newTotal);
      setTransactions(updatedTransactions);
      setShowDeleteModal(false);
      setTransactionToDeleteIndex(null);
    } catch (err) {
      console.error("Confirm delete error:", err);
      setError("Failed to delete transaction: " + err.message);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteTransaction = (index) => {
    setTransactionToDeleteIndex(index);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-amber-500"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-amber-400 animate-pulse"></div>
        </div>
        <p className="text-emerald-800 mt-6 text-lg font-medium">Loading transactions...</p>
        <p className="text-amber-700 text-sm">Getting your financial data ready</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 border-b border-emerald-300 p-6 mb-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-amber-500 rounded-full p-3 mr-4 shadow-lg">
              <FaWallet className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-emerald-800">
              Transaction Manager
            </h1>
          </div>
          <p className="text-emerald-700 text-lg font-medium">
            Track your income and expenses with ease
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mx-auto mt-4"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-8 rounded-2xl border border-emerald-300 mb-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-700/10 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative text-center">
            <div className="flex items-center justify-center mb-4">
              <FaChartLine className="text-amber-600 text-xl mr-3" />
              <h2 className="text-xl font-semibold text-emerald-800">Current Balance</h2>
            </div>
            <p className="text-5xl font-bold text-emerald-900 mb-2">
              ₹{totalAmount.toLocaleString("en-IN")}
            </p>
            <div className="text-amber-700 font-medium">
              {totalAmount > 0 ? "You're managing well!" : "Start adding income to begin"}
            </div>
          </div>
        </div>

        {/* Input Section - Step 1 */}
        <div className="bg-emerald-100 p-6 rounded-2xl border border-emerald-200 mb-6 shadow-md transition-all duration-500 relative z-20">
          {!showStep2 ? (
            <div className="flex flex-col lg:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-700 font-semibold text-lg">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-10 pr-4 py-4 bg-white border-2 border-emerald-200 rounded-xl text-emerald-800 placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-medium transition-all duration-300"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-4 flex-wrap justify-center">
                <button
                  onClick={handleAddIncome}
                  disabled={!amount || isNaN(amount) || Number(amount) <= 0}
                  onMouseEnter={() => setActiveHover('income')}
                  onMouseLeave={() => setActiveHover(null)}
                  className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-300 disabled:to-emerald-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent opacity-0 transition-opacity duration-500 ${activeHover === 'income' ? 'opacity-100' : ''
                    }`} />
                  <FaArrowUp className="text-amber-300" />
                  <span>Add Income</span>
                </button>

                <button
                  onClick={handleSubtractExpense}
                  disabled={!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > totalAmount}
                  onMouseEnter={() => setActiveHover('expense')}
                  onMouseLeave={() => setActiveHover(null)}
                  className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent opacity-0 transition-opacity duration-500 ${activeHover === 'expense' ? 'opacity-100' : ''
                    }`} />
                  <FaArrowDown className="text-amber-200" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Category Dropdown & Confirmation */
            <div className="animate-fade-in py-2">
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-emerald-200">
                    <h3 className="text-emerald-800 font-bold flex items-center gap-2">
                      {stagedType === 'Income' ? <FaArrowUp className="text-emerald-600" /> : <FaArrowDown className="text-red-500" />}
                      Adding {stagedType}: <span className="text-emerald-900 font-extrabold">₹{Number(amount).toLocaleString('en-IN')}</span>
                    </h3>
                    <button
                      onClick={() => setShowStep2(false)}
                      className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold underline hover:no-underline transition-all"
                    >
                      Change Amount
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 relative" ref={dropdownRef}>
                      <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Select Category</label>
                      
                      {/* Custom Dropdown Trigger */}
                      <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full p-4 bg-white border-2 border-emerald-200 rounded-xl text-emerald-800 focus:outline-none flex justify-between items-center cursor-pointer transition-all ${isDropdownOpen ? 'ring-2 ring-amber-500 border-transparent shadow-lg' : 'hover:border-emerald-300'}`}
                      >
                        <span className={`font-medium ${!selectedCategory ? 'text-emerald-500' : 'text-emerald-800'}`}>
                          {selectedCategory || "-- Choose a category --"}
                        </span>
                        <FaChevronDown className={`text-emerald-600 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white/90 backdrop-blur-md border-2 border-emerald-100 rounded-xl shadow-2xl overflow-hidden animate-scale-up">
                          {/* Search Input */}
                          <div className="p-3 border-b border-emerald-50">
                            <div className="relative">
                              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-sm" />
                              <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search categories..."
                                className="w-full pl-9 pr-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm text-emerald-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Options List */}
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {(stagedType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
                              .filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(cat => (
                                <div 
                                  key={cat}
                                  onClick={() => {
                                    setSelectedCategory(cat);
                                    setIsDropdownOpen(false);
                                    setSearchTerm("");
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-colors flex justify-between items-center ${
                                    selectedCategory === cat 
                                      ? 'bg-emerald-100 text-emerald-900 font-bold' 
                                      : 'hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900'
                                  }`}
                                >
                                  <span>{cat}</span>
                                  {selectedCategory === cat && <FaCheckCircle className="text-emerald-600 text-xs" />}
                                </div>
                              ))}
                            {(stagedType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
                              .filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
                              .length === 0 && (
                              <div className="p-4 text-center text-emerald-400 text-sm italic">
                                No categories found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedCategory === "Other" && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Custom Category Name</label>
                        <input
                          type="text"
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                          placeholder="e.g. Freelancing, Bonus..."
                          className="w-full p-4 bg-white border-2 border-emerald-200 rounded-xl text-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  <button
                    onClick={handleConfirmTransaction}
                    disabled={!selectedCategory || (selectedCategory === "Other" && !customCategoryName.trim())}
                    className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 min-w-[200px]"
                  >
                    <FaCheckCircle className="text-xl" />
                    <span>Confirm {stagedType}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-md">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500 text-lg" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-6 rounded-xl border border-emerald-300 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-700/10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-semibold mb-1">Total Income</p>
                <p className="text-emerald-900 font-bold text-2xl">
                  ₹{transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-amber-500 rounded-full p-3 shadow-md">
                <FaPlus className="text-white text-lg" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-700/10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-semibold mb-1">Total Expenses</p>
                <p className="text-red-900 font-bold text-2xl">
                  ₹{transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-red-500 rounded-full p-3 shadow-md">
                <FaMinus className="text-white text-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-md mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 rounded-full p-3 shadow-md">
                <FaHistory className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-800">Recent Transactions</h3>
                <p className="text-emerald-600 text-sm">Your latest financial activity</p>
              </div>
            </div>
            <div className="bg-emerald-700 text-amber-300 px-4 py-2 rounded-full">
              <span className="font-bold">{transactions.length}</span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-emerald-200 rounded-full p-8 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-emerald-600 text-2xl" />
              </div>
              <p className="text-emerald-700 text-lg font-semibold mb-2">No transactions yet</p>
              <p className="text-emerald-600">Add your first income or expense to get started!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.slice(0, 10).map((transaction, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-white rounded-xl border border-emerald-200 hover:border-amber-300 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shadow-md ${transaction.type === "Income"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      : "bg-gradient-to-br from-red-500 to-red-600"
                      }`}>
                      {transaction.type === "Income" ? (
                        <FaArrowUp className="text-white text-sm" />
                      ) : (
                        <FaArrowDown className="text-white text-sm" />
                      )}
                    </div>
                    <div>
                      <span className={`font-bold text-lg ${transaction.type === "Income" ? "text-emerald-700" : "text-red-700"
                        }`}>
                        {transaction.type} - {transaction.category || "General"}
                      </span>
                      <p className="text-emerald-600 font-semibold">₹{transaction.amount.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-emerald-800 font-semibold">
                        {new Date(transaction.date).toLocaleDateString("en-IN", {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-amber-700 text-sm flex items-center gap-1">
                        <FaClock className="text-xs" />
                        {new Date(transaction.date).toLocaleTimeString("en-IN", {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Transaction"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length > 10 && (
                <p className="text-center text-emerald-600 mt-4 font-medium">Showing 10 most recent transactions</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100 shadow-2xl p-8 max-w-sm w-full transform animate-scale-up">
            <div className="text-center">
              <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900 mb-2">Delete Transaction?</h3>
              <p className="text-emerald-700 mb-8 leading-relaxed">
                This action will permanently remove this record and update your total balance.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transaction;
// import React, { useState, useEffect } from "react";
// import { db, doc, setDoc, getDoc, updateDoc, arrayUnion } from "../firebase";
// import { 
//   FaPlus, 
//   FaMinus, 
//   FaWallet, 
//   FaArrowUp, 
//   FaArrowDown, 
//   FaHistory, 
//   FaExclamationTriangle,
//   FaCheckCircle,
//   FaClock,
//   FaChartLine
// } from "react-icons/fa";

// function Transaction({ user }) {
//   const [totalAmount, setTotalAmount] = useState(0);
//   const [amount, setAmount] = useState("");
//   const [transactions, setTransactions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [activeHover, setActiveHover] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!user || !user.email) {
//         setError("User not authenticated or email not available");
//         setLoading(false);
//         return;
//       }

//       try {
//         const userDocRef = doc(db, "transactions", user.email);
//         const docSnap = await getDoc(userDocRef);

//         if (docSnap.exists()) {
//           const data = docSnap.data();
//           setTotalAmount(data.totalAmount || 0);
//           const validTransactions = (data.transactions || []).filter(t => t.date);
//           setTransactions(validTransactions);
//         } else {
//           await setDoc(userDocRef, { totalAmount: 0, transactions: [] });
//           setTotalAmount(0);
//           setTransactions([]);
//         }
//       } catch (err) {
//         setError("Failed to fetch data: " + err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [user]);

//   const handleAddIncome = async () => {
//     if (!user || !user.email) {
//       setError("User not authenticated. Please sign in again.");
//       return;
//     }

//     if (!amount || isNaN(amount) || Number(amount) <= 0) {
//       setError("Please enter a valid positive amount");
//       return;
//     }

//     try {
//       setError(null);
//       const userDocRef = doc(db, "transactions", user.email);
//       const newTotal = totalAmount + Number(amount);
//       const clientTimestamp = new Date().toISOString();
      
//       const transaction = {
//         type: "Income",
//         amount: Number(amount),
//         date: clientTimestamp,
//         createdAt: clientTimestamp,
//       };

//       await updateDoc(userDocRef, {
//         totalAmount: newTotal,
//         transactions: arrayUnion(transaction)
//       });

//       setTotalAmount(newTotal);
//       setTransactions((prev) => [...prev, transaction].sort((a, b) => new Date(b.date) - new Date(a.date)));
//       setAmount("");
//     } catch (err) {
//       console.error("Add income error:", err);
//       setError("Failed to add income: " + err.message);
//     }
//   };

//   const handleSubtractExpense = async () => {
//     if (!user || !user.email) {
//       setError("User not authenticated. Please sign in again.");
//       return;
//     }

//     if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > totalAmount) {
//       setError("Please enter a valid amount less than or equal to current total");
//       return;
//     }

//     try {
//       setError(null);
//       const userDocRef = doc(db, "transactions", user.email);
//       const newTotal = totalAmount - Number(amount);
//       const clientTimestamp = new Date().toISOString();
      
//       const transaction = {
//         type: "Expense",
//         amount: Number(amount),
//         date: clientTimestamp,
//         createdAt: clientTimestamp,
//       };

//       await updateDoc(userDocRef, {
//         totalAmount: newTotal,
//         transactions: arrayUnion(transaction)
//       });

//       setTotalAmount(newTotal);
//       setTransactions((prev) => [...prev, transaction].sort((a, b) => new Date(b.date) - new Date(a.date)));
//       setAmount("");
//     } catch (err) {
//       console.error("Subtract expense error:", err);
//       setError("Failed to subtract expense: " + err.message);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center">
//         <div className="relative">
//           <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-amber-500"></div>
//           <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-amber-400 animate-pulse"></div>
//         </div>
//         <p className="text-emerald-800 mt-6 text-lg font-medium">Loading transactions...</p>
//         <p className="text-amber-700 text-sm">Getting your financial data ready</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-emerald-50">
//       {/* Header */}
//       <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 border-b border-emerald-300 p-6 mb-6">
//         <div className="max-w-4xl mx-auto text-center">
//           <div className="flex items-center justify-center mb-4">
//             <div className="bg-amber-500 rounded-full p-3 mr-4 shadow-lg">
//               <FaWallet className="text-white text-2xl" />
//             </div>
//             <h1 className="text-3xl font-bold text-emerald-800">
//               Transaction Manager
//             </h1>
//           </div>
//           <p className="text-emerald-700 text-lg font-medium">
//             Track your income and expenses with ease
//           </p>
//           <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mx-auto mt-4"></div>
//         </div>
//       </div>

//       <div className="max-w-4xl mx-auto px-6">
//         {/* Balance Card */}
//         <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-8 rounded-2xl border border-emerald-300 mb-6 shadow-lg relative overflow-hidden">
//           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16"></div>
//           <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-700/10 rounded-full translate-y-12 -translate-x-12"></div>
//           <div className="relative text-center">
//             <div className="flex items-center justify-center mb-4">
//               <FaChartLine className="text-amber-600 text-xl mr-3" />
//               <h2 className="text-xl font-semibold text-emerald-800">Current Balance</h2>
//             </div>
//             <p className="text-5xl font-bold text-emerald-900 mb-2">
//               ₹{totalAmount.toLocaleString("en-IN")}
//             </p>
//             <div className="text-amber-700 font-medium">
//               {totalAmount > 0 ? "You're managing well!" : "Start adding income to begin"}
//             </div>
//           </div>
//         </div>

//         {/* Input Section */}
//         <div className="bg-emerald-100 p-6 rounded-2xl border border-emerald-200 mb-6 shadow-md">
//           <div className="flex flex-col lg:flex-row gap-6 items-center">
//             <div className="flex-1 w-full">
//               <div className="relative">
//                 <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-700 font-semibold text-lg">₹</span>
//                 <input
//                   type="number"
//                   value={amount}
//                   onChange={(e) => setAmount(e.target.value)}
//                   placeholder="Enter amount"
//                   className="w-full pl-10 pr-4 py-4 bg-white border-2 border-emerald-200 rounded-xl text-emerald-800 placeholder-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-medium transition-all duration-300"
//                   min="0"
//                   step="0.01"
//                 />
//               </div>
//             </div>
            
//             <div className="flex gap-4 flex-wrap justify-center">
//               <button
//                 onClick={handleAddIncome}
//                 disabled={!amount || isNaN(amount) || Number(amount) <= 0}
//                 onMouseEnter={() => setActiveHover('income')}
//                 onMouseLeave={() => setActiveHover(null)}
//                 className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-300 disabled:to-emerald-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg overflow-hidden"
//               >
//                 <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent opacity-0 transition-opacity duration-500 ${
//                   activeHover === 'income' ? 'opacity-100' : ''
//                 }`} />
//                 <FaArrowUp className="text-amber-300" />
//                 <span>Add Income</span>
//               </button>
              
//               <button
//                 onClick={handleSubtractExpense}
//                 disabled={!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > totalAmount}
//                 onMouseEnter={() => setActiveHover('expense')}
//                 onMouseLeave={() => setActiveHover(null)}
//                 className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg overflow-hidden"
//               >
//                 <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent opacity-0 transition-opacity duration-500 ${
//                   activeHover === 'expense' ? 'opacity-100' : ''
//                 }`} />
//                 <FaArrowDown className="text-amber-200" />
//                 <span>Add Expense</span>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Error Display */}
//         {error && (
//           <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-md">
//             <div className="flex items-center gap-3">
//               <FaExclamationTriangle className="text-red-500 text-lg" />
//               <span className="font-medium">{error}</span>
//             </div>
//           </div>
//         )}

//         {/* Stats Cards */}
//         <div className="grid md:grid-cols-2 gap-6 mb-6">
//           <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-6 rounded-xl border border-emerald-300 shadow-md relative overflow-hidden">
//             <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-700/10 rounded-full -translate-y-8 translate-x-8"></div>
//             <div className="relative flex items-center justify-between">
//               <div>
//                 <p className="text-emerald-700 text-sm font-semibold mb-1">Total Income</p>
//                 <p className="text-emerald-900 font-bold text-2xl">
//                   ₹{transactions.filter(t => t.type === "Income").reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN")}
//                 </p>
//               </div>
//               <div className="bg-amber-500 rounded-full p-3 shadow-md">
//                 <FaPlus className="text-white text-lg" />
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-md relative overflow-hidden">
//             <div className="absolute top-0 right-0 w-16 h-16 bg-red-700/10 rounded-full -translate-y-8 translate-x-8"></div>
//             <div className="relative flex items-center justify-between">
//               <div>
//                 <p className="text-red-700 text-sm font-semibold mb-1">Total Expenses</p>
//                 <p className="text-red-900 font-bold text-2xl">
//                   ₹{transactions.filter(t => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN")}
//                 </p>
//               </div>
//               <div className="bg-red-500 rounded-full p-3 shadow-md">
//                 <FaMinus className="text-white text-lg" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Recent Transactions */}
//         <div className="bg-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-md mb-6">
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center gap-3">
//               <div className="bg-amber-500 rounded-full p-3 shadow-md">
//                 <FaHistory className="text-white text-lg" />
//               </div>
//               <div>
//                 <h3 className="text-2xl font-bold text-emerald-800">Recent Transactions</h3>
//                 <p className="text-emerald-600 text-sm">Your latest financial activity</p>
//               </div>
//             </div>
//             <div className="bg-emerald-700 text-amber-300 px-4 py-2 rounded-full">
//               <span className="font-bold">{transactions.length}</span>
//             </div>
//           </div>
          
//           {transactions.length === 0 ? (
//             <div className="text-center py-12">
//               <div className="bg-emerald-200 rounded-full p-8 w-20 h-20 flex items-center justify-center mx-auto mb-4">
//                 <FaCheckCircle className="text-emerald-600 text-2xl" />
//               </div>
//               <p className="text-emerald-700 text-lg font-semibold mb-2">No transactions yet</p>
//               <p className="text-emerald-600">Add your first income or expense to get started!</p>
//             </div>
//           ) : (
//             <div className="space-y-3 max-h-96 overflow-y-auto">
//               {transactions.slice(0, 10).map((transaction, index) => (
//                 <div 
//                   key={index} 
//                   className="flex justify-between items-center p-4 bg-white rounded-xl border border-emerald-200 hover:border-amber-300 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] group"
//                 >
//                   <div className="flex items-center gap-4">
//                     <div className={`p-3 rounded-full shadow-md ${
//                       transaction.type === "Income" 
//                         ? "bg-gradient-to-br from-emerald-500 to-emerald-600" 
//                         : "bg-gradient-to-br from-red-500 to-red-600"
//                     }`}>
//                       {transaction.type === "Income" ? (
//                         <FaArrowUp className="text-white text-sm" />
//                       ) : (
//                         <FaArrowDown className="text-white text-sm" />
//                       )}
//                     </div>
//                     <div>
//                       <span className={`font-bold text-lg ${
//                         transaction.type === "Income" ? "text-emerald-700" : "text-red-700"
//                       }`}>
//                         {transaction.type}
//                       </span>
//                       <p className="text-emerald-600 font-semibold">₹{transaction.amount.toLocaleString("en-IN")}</p>
//                     </div>
//                   </div>
//                   <div className="text-right flex items-center gap-2">
//                     <div>
//                       <p className="text-emerald-800 font-semibold">
//                         {new Date(transaction.date).toLocaleDateString("en-IN", { 
//                           day: '2-digit', 
//                           month: 'short', 
//                           year: 'numeric' 
//                         })}
//                       </p>
//                       <p className="text-amber-700 text-sm flex items-center gap-1">
//                         <FaClock className="text-xs" />
//                         {new Date(transaction.date).toLocaleTimeString("en-IN", { 
//                           hour: '2-digit', 
//                           minute: '2-digit' 
//                         })}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//               {transactions.length > 10 && (
//                 <p className="text-center text-emerald-600 mt-4 font-medium">Showing 10 most recent transactions</p>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Transaction;