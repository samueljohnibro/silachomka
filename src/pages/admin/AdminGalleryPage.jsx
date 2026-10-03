import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const AdminGalleryPage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  
  const [currentPost, setCurrentPost] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getGallery();
      setPosts(data);
    } catch (err) {
      setError(err.message || "Failed to load gallery posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreateClick = () => {
    setCurrentPost({
      slug: "",
      title: "",
      caption: "",
      category: "portraits",
      post_type: "image",
      primary_asset_id: "",
      related_release_id: "",
      related_track_id: "",
      related_beat_id: "",
      legacy_link: "",
      tags: "",
      post_date: "",
      display_date: "",
      status: "DRAFT"
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (post) => {
    setCurrentPost({
      ...post,
      tags: post.tags ? JSON.stringify(post.tags) : ""
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentPost(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPost(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentPost.slug || !currentPost.title || !currentPost.post_type || !currentPost.post_date) {
      setError("Slug, Title, Post Type, and Post Date are required.");
      return;
    }

    try {
      const payload = { ...currentPost };
      const nullableFields = ["caption", "category", "primary_asset_id", "related_release_id", "related_track_id", "related_beat_id", "legacy_link", "display_date"];
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });
      
      if (payload.tags === "") {
        payload.tags = null;
      } else if (payload.tags) {
        payload.tags = JSON.parse(payload.tags);
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createGalleryPost(payload);
      } else {
        await adminApi.updateGalleryPost(payload.id, payload);
      }
      
      await fetchPosts();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save gallery post.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteGalleryPost(id);
      await fetchPosts();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading gallery posts...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Gallery Post" : "Edit Gallery Post"}
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
              <label>Title *</label>
              <input type="text" name="title" className="studio-input" value={currentPost.title || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Slug *</label>
              <input type="text" name="slug" className="studio-input" value={currentPost.slug || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Post Type *</label>
              <input type="text" name="post_type" className="studio-input" value={currentPost.post_type || ""} onChange={handleChange} required disabled={isSaving} placeholder="e.g. image, carousel, video" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Category</label>
              <input type="text" name="category" className="studio-input" value={currentPost.category || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. portraits, live" />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Dates</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Post Date * (YYYY-MM-DD)</label>
              <input type="text" name="post_date" className="studio-input" value={currentPost.post_date || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Display Date</label>
              <input type="text" name="display_date" className="studio-input" value={currentPost.display_date || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Details & Assets</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Caption</label>
              <textarea name="caption" className="studio-input" style={{ minHeight: "80px", resize: "vertical" }} value={currentPost.caption || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Primary Asset ID</label>
              <input type="text" name="primary_asset_id" className="studio-input" value={currentPost.primary_asset_id || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Relations & Metadata</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Related Release ID</label>
              <input type="text" name="related_release_id" className="studio-input" value={currentPost.related_release_id || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Related Track ID</label>
              <input type="text" name="related_track_id" className="studio-input" value={currentPost.related_track_id || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Related Beat ID</label>
              <input type="text" name="related_beat_id" className="studio-input" value={currentPost.related_beat_id || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Legacy Link</label>
              <input type="text" name="legacy_link" className="studio-input" value={currentPost.legacy_link || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Tags (JSON Array)</label>
              <input type="text" name="tags" className="studio-input" value={currentPost.tags || ""} onChange={handleChange} disabled={isSaving} placeholder="['tag1', 'tag2']" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Status</label>
              <select name="status" className="studio-input" value={currentPost.status || "DRAFT"} onChange={handleChange} disabled={isSaving}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Post"}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Gallery Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Post</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {posts.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Gallery Posts Found</h2>
          <p>You haven't added any posts to the gallery yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Post</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {post.title}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>/{post.slug}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {post.post_type}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>{post.post_date}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: "uppercase",
                      background: post.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      color: post.status === "PUBLISHED" ? "#34d399" : "#fbbf24"
                    }}>
                      {post.status || "DRAFT"}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === post.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(post.id)} 
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
                          onClick={() => handleEditClick(post)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(post.id)}
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

export default AdminGalleryPage;
