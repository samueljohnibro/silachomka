import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import MediaAssetPicker from "../../components/admin/MediaAssetPicker";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import "./admin.css";

const AdminMerchandisePage = () => {
  const [merchandise, setMerchandise] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  const [viewMode, setViewMode] = useState("table");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [currentItem, setCurrentItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMerchandise = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMerchandise();
      setMerchandise(data);
    } catch (err) {
      setError(err.message || "Failed to load merchandise.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const handleCreateClick = () => {
    setCurrentItem({
      slug: "",
      name: "",
      description: "",
      primary_asset_id: "",
      price_cents: "",
      currency: "USD",
      selar_url: "",
      status: "PLANNED"
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (item) => {
    setCurrentItem({
      ...item
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentItem(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentItem(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentItem.slug || !currentItem.name) {
      setError("Slug and Name are required.");
      return;
    }

    try {
      const payload = { ...currentItem };
      const nullableFields = ["description", "primary_asset_id", "selar_url", "currency"];
      
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });
      
      if (payload.price_cents === "") {
        payload.price_cents = null;
      } else if (payload.price_cents !== null) {
        payload.price_cents = Number(payload.price_cents);
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createMerchandise(payload);
      } else {
        await adminApi.updateMerchandise(payload.id, payload);
      }
      
      await fetchMerchandise();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save merchandise.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteMerchandise(id);
      await fetchMerchandise();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete merchandise.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading merchandise...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Merchandise" : "Edit Merchandise"}
          </h2>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: "transparent", color: "var(--text)" }} disabled={isSaving}>
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Basic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Name *</label>
              <input type="text" name="name" className="studio-input" value={currentItem.name || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Slug *</label>
              <input type="text" name="slug" className="studio-input" value={currentItem.slug || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left", gridColumn: "span 2" }}>
              <label>Description</label>
              <textarea name="description" className="studio-input" style={{ minHeight: "80px", resize: "vertical" }} value={currentItem.description || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Pricing & Links</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Price (Cents)</label>
              <input type="number" name="price_cents" className="studio-input" value={currentItem.price_cents || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. 1999 for $19.99" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Currency</label>
              <input type="text" name="currency" className="studio-input" value={currentItem.currency || ""} onChange={handleChange} disabled={isSaving} placeholder="USD" />
            </div>
            <div className="studio-field" style={{ textAlign: "left", gridColumn: "span 2" }}>
              <label>Selar URL (Shop Link)</label>
              <input type="text" name="selar_url" className="studio-input" value={currentItem.selar_url || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Media & Display</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <MediaAssetPicker
              label="Product Image"
              assetType="IMAGE"
              value={currentItem.primary_asset_id}
              onChange={(id) => setCurrentItem(prev => ({ ...prev, primary_asset_id: id }))}
              disabled={isSaving}
              hint="Select product photo or enter file path (e.g. covers/merch-hoodie.jpg)"
            />
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Status</label>
              <select name="status" className="studio-input" value={currentItem.status || "PLANNED"} onChange={handleChange} disabled={isSaving}>
                <option value="PLANNED">Planned</option>
                <option value="AVAILABLE">Available</option>
                <option value="SOLD_OUT">Sold Out</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Item"}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // Sort merchandise by created_at
  const sortedMerchandise = [...merchandise].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === "desc" ? db - da : da - db;
  });

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Merchandise Management</h2>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Items" />
            <AdminViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
        <button className="primary-button" onClick={handleCreateClick}>+ Add Item</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {sortedMerchandise.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Merchandise Found</h2>
          <p>You haven't added any merchandise yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Add First Item</button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="admin-listing-grid">
          {sortedMerchandise.map((item) => (
            <div key={item.id} className="admin-item-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-h)" }}>{item.name}</h3>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>/{item.slug}</div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}>
                  {item.status}
                </span>
              </div>

              <div style={{ margin: "12px 0 6px", fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>
                {item.price_cents ? `${item.price_cents / 100} ${item.currency || "USD"}` : "TBA"}
              </div>

              {item.description && (
                <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {item.description}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => handleEditClick(item)}
                  className="studio-pill-btn"
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                {deleteConfirmId === item.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="studio-pill-btn"
                      style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", borderColor: "#fca5a5" }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "..." : "Yes"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="studio-pill-btn"
                      disabled={isDeleting}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="studio-pill-btn"
                    style={{ background: "transparent", color: "var(--muted)" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Price / Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMerchandise.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {item.name}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>/{item.slug}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {item.price_cents ? `${item.price_cents / 100} ${item.currency || 'USD'}` : 'TBA'}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>{item.status}</div>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === item.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="studio-pill-btn" 
                          style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", borderColor: "#fca5a5" }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "..." : "Yes"}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)} 
                          className="studio-pill-btn"
                          disabled={isDeleting}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="studio-pill-btn"
                          style={{ background: "transparent", color: "var(--muted)" }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMerchandisePage;
