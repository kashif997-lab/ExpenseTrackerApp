import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { database, auth } from "../firebase";
import { signOut } from "firebase/auth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DailyExpenseTracker.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const DailyExpenseTracker = () => {
  const [entries, setEntries] = useState([]);
  const [amount, setAmount] = useState("");
  const [expense, setExpense] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date()); // For entry
  const [selectedMonth, setSelectedMonth] = useState(new Date()); // For viewing
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const fetchEntries = async (date = new Date()) => {
    const userId = auth.currentUser.uid;
    const monthKey = date.toISOString().slice(0, 7); // e.g., "2025-05"
    const docRef = doc(database, "expenses", userId, "monthlyData", monthKey);

    try {
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const indexed = data.entries.map((e, i) => ({ ...e, id: i }));
        setEntries(indexed.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to fetch entries:", err);
      toast.error("Failed to load entries.");
    }
  };

  useEffect(() => {
    fetchEntries(selectedMonth);
  }, []);

  const handleAddOrUpdateEntry = async () => {
    if (!amount || !expense || !selectedDate) return;

    const formattedDate = selectedDate.toISOString().split("T")[0];
    const monthKey = selectedDate.toISOString().slice(0, 7);
    const userId = auth.currentUser.uid;

    const newEntry = {
      date: formattedDate,
      amount: parseFloat(amount),
      expense: parseFloat(expense),
      remaining: parseFloat(amount) - parseFloat(expense),
      description: description.trim().slice(0, 150) || "No description"
    };

    const docRef = doc(database, "expenses", userId, "monthlyData", monthKey);

    try {
      const existingDoc = await getDoc(docRef);
      let updatedEntries = [];

      if (existingDoc.exists()) {
        const data = existingDoc.data();
        updatedEntries = data.entries || [];
      }

      const duplicateDateIndex = updatedEntries.findIndex(e => e.date === formattedDate);

      if (editId === null && duplicateDateIndex !== -1) {
        toast.error("An entry for this date already exists. Please edit it instead.");
        return;
      }

      if (editId !== null) {
        updatedEntries[editId] = newEntry;
        toast.success("Entry updated successfully.");
        setEditId(null);
      } else {
        updatedEntries.push(newEntry);
        toast.success("Entry added successfully.");
      }

      await setDoc(docRef, { entries: updatedEntries });
      fetchEntries(selectedMonth);
      setAmount("");
      setExpense("");
      setDescription("");
      setSelectedDate(new Date());
    } catch (err) {
      console.error("Firestore Error:", err);
      toast.error("Failed to save entry. Please try again.");
    }
  };

  const handleDelete = async (index) => {
    const monthKey = selectedMonth.toISOString().slice(0, 7);
    const userId = auth.currentUser.uid;
    const docRef = doc(database, "expenses", userId, "monthlyData", monthKey);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const updated = data.entries.filter((_, i) => i !== index);
      await setDoc(docRef, { entries: updated });
      fetchEntries(selectedMonth);
      toast.info("Entry deleted.");
    }
  };

  const handleEdit = (entry) => {
    setAmount(entry.amount);
    setExpense(entry.expense);
    setDescription(entry.description || "");
    setSelectedDate(new Date(entry.date));
    setEditId(entry.id);
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalRemaining = entries.reduce((acc, curr) => acc + curr.remaining, 0);

  const handleDownloadPDF = () => {
    try {
      const currentMonth = selectedMonth.getMonth();
      const currentYear = selectedMonth.getFullYear();

      const monthlyEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === currentMonth &&
          entryDate.getFullYear() === currentYear
        );
      });

      if (monthlyEntries.length === 0) {
        toast.warn("No entries found for the selected month.");
        return;
      }

      const doc = new jsPDF();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      doc.setFontSize(16);
      doc.text("Monthly Expense Report", 14, 20);

      const tableColumn = ["Date", "Amount", "Expense", "Remaining", "Description"];
      const tableRows = monthlyEntries.map((entry) => [
        entry.date,
        `${entry.amount.toFixed(2)}`,
        `${entry.expense.toFixed(2)}`,
        `${entry.remaining.toFixed(2)}`,
        entry.description || ""
      ]);

      const totalAmount = monthlyEntries.reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = monthlyEntries.reduce((acc, curr) => acc + curr.expense, 0);
      const totalRemain = monthlyEntries.reduce((acc, curr) => acc + curr.remaining, 0);

      tableRows.push([
        "TOTAL",
        `${totalAmount.toFixed(2)}`,
        `${totalExpense.toFixed(2)}`,
        `${totalRemain.toFixed(2)}`,
        ""
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 11 },
        columnStyles: { 4: { cellWidth: 60 } },
        headStyles: { fillColor: [30, 144, 255] }
      });

      doc.save(`MonthlyExpenseReport_${timestamp}.pdf`);
      toast.success("PDF downloaded successfully.");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF.");
    }
  };

  return (
    <div className="tracker-container">
      <h1 className="tracker-title">Daily Expense Tracker</h1>

      {/* Month Picker to view entries */}
      <label>Select Month to View</label>
      <DatePicker
        selected={selectedMonth}
        onChange={(date) => {
          setSelectedMonth(date);
          fetchEntries(date);
        }}
        dateFormat="yyyy-MM"
        showMonthYearPicker
        className="input-field"
      />

      <div className="form-card">
        {/* Full date picker for entry */}
        <label>Pick Date for Entry</label>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="yyyy-MM-dd"
          className="input-field"
        />

        <input
          type="number"
          placeholder="Enter Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field"
        />
        <input
          type="number"
          placeholder="Enter Expense"
          value={expense}
          onChange={(e) => setExpense(e.target.value)}
          className="input-field"
        />
        <textarea
          placeholder="Enter Description (max 150 chars)"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 150))}
          maxLength={150}
          className="input-field description-input"
        />
        <button className="add-button" onClick={handleAddOrUpdateEntry}>
          {editId !== null ? "Update Entry" : "Add Entry"}
        </button>
      </div>

      <div className="table-card">
        <table className="tracker-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Expense</th>
              <th>Remaining</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <React.Fragment key={entry.id}>
                <tr>
                  <td>{entry.date}</td>
                  <td>{entry.amount.toFixed(2)}</td>
                  <td>{entry.expense.toFixed(2)}</td>
                  <td>{entry.remaining.toFixed(2)}</td>
                  <td>
                    <button className="action-button edit" onClick={() => handleEdit(entry)}>
                      Edit
                    </button>
                    <button className="action-button delete" onClick={() => handleDelete(entry.id)}>
                      Delete
                    </button>
                    <button className="action-button" onClick={() => toggleDescription(entry.id)}>
                      {expandedDescriptions[entry.id] ? "Hide" : "Show"} Desc
                    </button>
                  </td>
                </tr>
                {expandedDescriptions[entry.id] && (
                  <tr>
                    <td colSpan="5">
                      <div className="description-preview">{entry.description}</div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div className="total-remaining">
          Total Remaining: {totalRemaining.toFixed(2)}
        </div>
      </div>

      <button className="download-button" onClick={handleDownloadPDF}>
        Download Monthly PDF Report
      </button>

      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
      <button onClick={() => signOut(auth)} className="logout-button">
        Logout
      </button>
    </div>
  );
};

export default DailyExpenseTracker;
