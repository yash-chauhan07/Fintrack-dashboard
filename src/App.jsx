import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Moon,
  Sun,
  Shield,
  Eye,
  TrendingUp,
  PieChart as PieChartIcon,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_TRANSACTIONS, CATEGORY_COLORS } from './mockData';
import { cn, formatCurrency, getCurrencySymbol } from './lib/utils';

// --- Components ---

const Card = ({ children, className, id }) => (
  <div id={id} className={cn("bg-card text-card-foreground rounded-xl border shadow-sm p-6", className)}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, trend, type, currency }) => {
  const isPositiveTrend = trend?.startsWith('+');
  const isNegativeTrend = trend?.startsWith('-');
  
  let trendColorClass = "bg-muted text-muted-foreground";
  if (type === 'expense') {
    if (isPositiveTrend) trendColorClass = "bg-rose-500/10 text-rose-500";
    else if (isNegativeTrend) trendColorClass = "bg-emerald-500/10 text-emerald-500";
  } else {
    if (isPositiveTrend) trendColorClass = "bg-emerald-500/10 text-emerald-500";
    else if (isNegativeTrend) trendColorClass = "bg-rose-500/10 text-rose-500";
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{formatCurrency(value, currency)}</h3>
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          type === 'income' ? "bg-emerald-500/10 text-emerald-500" : 
          type === 'expense' ? "bg-rose-500/10 text-rose-500" : 
          "bg-blue-500/10 text-blue-500"
        )}>
          <Icon size={24} />
        </div>
      </div>
      {trend && trend !== '0%' && (
        <div className="mt-4 flex items-center gap-1">
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded-full",
            trendColorClass
          )}>
            {trend}
          </span>
          <span className="text-xs text-muted-foreground">from last month</span>
        </div>
      )}
    </Card>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-md rounded-xl border shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-bottom">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [role, setRole] = useState('admin');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Initialize data
  useEffect(() => {
    const savedTransactions = localStorage.getItem('fintrack_transactions');
    const savedRole = localStorage.getItem('fintrack_role');
    const savedTheme = localStorage.getItem('fintrack_theme');
    const savedCurrency = localStorage.getItem('fintrack_currency');

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setTransactions(MOCK_TRANSACTIONS);
    }

    if (savedRole) setRole(savedRole);
    if (savedTheme === 'dark') setIsDarkMode(true);
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fintrack_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('fintrack_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('fintrack_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Derived Data ---

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const previousMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };

    const currentIncome = transactions
      .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const currentExpenses = transactions
      .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);

    const prevIncome = transactions
      .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), previousMonth))
      .reduce((sum, t) => sum + t.amount, 0);
    const prevExpenses = transactions
      .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), previousMonth))
      .reduce((sum, t) => sum + t.amount, 0);

    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const diff = ((current - previous) / previous) * 100;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      totalBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      balanceTrend: calculateTrend(currentIncome - currentExpenses, prevIncome - prevExpenses),
      incomeTrend: calculateTrend(currentIncome, prevIncome),
      expenseTrend: calculateTrend(currentExpenses, prevExpenses)
    };
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const categories = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#94a3b8'
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const trendData = useMemo(() => {
    // Generate last 7 days trend
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = subDays(now, i);
      const formattedDate = format(targetDate, 'MMM dd');
      
      // Transactions up to this day (inclusive)
      const upToThisDay = transactions.filter(t => {
        const tDate = parseISO(t.date);
        return tDate <= targetDate;
      });
      
      const incomeUpTo = upToThisDay.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expensesUpTo = upToThisDay.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      // Transactions on this specific day
      const onThisDay = transactions.filter(t => format(parseISO(t.date), 'MMM dd') === formattedDate);
      const dayIncome = onThisDay.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const dayExpenses = onThisDay.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        date: formattedDate,
        income: dayIncome,
        expenses: dayExpenses,
        balance: incomeUpTo - expensesUpTo
      });
    }
    return data;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, filterType]);

  const insights = useMemo(() => {
    const highestCategory = spendingByCategory[0];
    const monthlyIncome = transactions
      .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }))
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      highestCategory,
      monthlyIncome,
      savingsRate: stats.totalIncome > 0 ? ((stats.totalIncome - stats.totalExpenses) / stats.totalIncome * 100).toFixed(1) : '0'
    };
  }, [transactions, spendingByCategory, stats]);

  // --- Handlers ---

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (role !== 'admin') return;

    const formData = new FormData(e.currentTarget);
    const newTransaction = {
      id: editingTransaction?.id || Math.random().toString(36).substr(2, 9),
      date: formData.get('date'),
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      type: formData.get('type'),
      description: formData.get('description'),
    };

    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? newTransaction : t));
    } else {
      setTransactions([...transactions, newTransaction]);
    }
    
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id) => {
    if (role !== 'admin') return;
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const openEditModal = (transaction) => {
    if (role !== 'admin') return;
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 border-r bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FinTrack</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          {/* Add more nav items as needed */}
        </nav>

        <div className="p-4 border-t">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-4 mb-2">System</p>
          <div className="px-4 py-2 text-xs text-muted-foreground">
            v1.0.0 Stable
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
              <p className="text-muted-foreground">Welcome back! Here's what's happening with your money.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Role Switcher */}
              <div className="bg-muted p-1 rounded-lg flex h-10">
                <button 
                  onClick={() => setRole('viewer')}
                  className={cn(
                    "px-3 flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-all",
                    role === 'viewer' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye size={14} />
                  Viewer
                </button>
                <button 
                  onClick={() => setRole('admin')}
                  className={cn(
                    "px-3 flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-all",
                    role === 'admin' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Shield size={14} />
                  Admin
                </button>
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Currency Selector */}
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 bg-muted px-3 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
              </select>

              {role === 'admin' && (
                <button 
                  onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                  className="h-10 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Add Transaction</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Balance" 
            value={stats.totalBalance} 
            icon={Wallet} 
            trend={stats.balanceTrend} 
            type="balance"
            currency={currency}
          />
          <StatCard 
            title="Total Income" 
            value={stats.totalIncome} 
            icon={ArrowUpRight} 
            trend={stats.incomeTrend} 
            type="income"
            currency={currency}
          />
          <StatCard 
            title="Total Expenses" 
            value={stats.totalExpenses} 
            icon={ArrowDownLeft} 
            trend={stats.expenseTrend} 
            type="expense"
            currency={currency}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Balance Trend</h3>
                <p className="text-sm text-muted-foreground">Daily balance movement over the last 7 days</p>
              </div>
              <TrendingUp className="text-muted-foreground" size={20} />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickFormatter={(value) => formatCurrency(value, currency)}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [formatCurrency(value, currency), 'Balance']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="var(--primary)" 
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Spending Breakdown</h3>
                <p className="text-sm text-muted-foreground">Expenses categorized by type</p>
              </div>
              <PieChartIcon className="text-muted-foreground" size={20} />
            </div>
            <div className="h-[300px] w-full flex items-center justify-center">
              {spendingByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {spendingByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No expense data available</div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {spendingByCategory.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium truncate">{cat.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(cat.value, currency)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <h4 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-2">Top Spending</h4>
            {insights.highestCategory ? (
              <>
                <p className="text-2xl font-bold">{insights.highestCategory.name}</p>
                <p className="text-sm text-muted-foreground mt-1">You've spent {formatCurrency(insights.highestCategory.value, currency)} on this category.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <h4 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-2">Savings Rate</h4>
            <p className="text-2xl font-bold">{insights.savingsRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Of your total income is being saved.</p>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-2">Monthly Income</h4>
            <p className="text-2xl font-bold">{formatCurrency(insights.monthlyIncome, currency)}</p>
            <p className="text-sm text-muted-foreground mt-1">Total income earned this month so far.</p>
          </Card>
        </div>

        {/* Transactions Section */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-semibold text-lg">Recent Transactions</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64"
                />
              </div>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-muted px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-muted-foreground border-b">
                  <th className="pb-4 font-medium">Description</th>
                  <th className="pb-4 font-medium">Category</th>
                  <th className="pb-4 font-medium">Date</th>
                  <th className="pb-4 font-medium">Amount ({getCurrencySymbol(currency)})</th>
                  <th className="pb-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            t.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <span className="font-medium">{t.description}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm px-2 py-1 rounded-md bg-muted">{t.category}</span>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {format(parseISO(t.date), 'MMM dd, yyyy')}
                      </td>
                      <td className={cn(
                        "py-4 font-semibold",
                        t.type === 'income' ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                      </td>
                      <td className="py-4 text-right">
                        {role === 'admin' ? (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal(t)}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} 
            title={editingTransaction ? "Edit Transaction" : "New Transaction"}
          >
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Description</label>
                <input 
                  name="description" 
                  required 
                  defaultValue={editingTransaction?.description}
                  placeholder="e.g. Grocery shopping"
                  className="w-full px-4 py-2.5 bg-muted/50 text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(currency)}</span>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01"
                      required 
                      defaultValue={editingTransaction?.amount}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-muted/50 text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Type</label>
                  <select 
                    name="type" 
                    required 
                    defaultValue={editingTransaction?.type || 'expense'}
                    className="w-full px-4 py-2.5 bg-muted/50 text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="expense" className="bg-card">Expense</option>
                    <option value="income" className="bg-card">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Category</label>
                  <select 
                    name="category" 
                    required 
                    defaultValue={editingTransaction?.category || 'Food'}
                    className="w-full px-4 py-2.5 bg-muted/50 text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat} className="bg-card">{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Date</label>
                  <input 
                    name="date" 
                    type="date" 
                    required 
                    defaultValue={editingTransaction?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-2.5 bg-muted/50 text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4 border-t border-border">
                <button 
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingTransaction(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border font-semibold hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 shadow-lg shadow-primary/10 transition-all active:scale-95"
                >
                  {editingTransaction ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
