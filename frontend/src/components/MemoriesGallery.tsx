import { useState } from 'react';
import { Camera, Plus, Heart, MapPin, Calendar } from 'lucide-react';

interface Memory {
  id: string;
  title: string;
  date: string;
  location: string;
  imageUrl: string;
  tag: 'Trips' | 'Video Calls' | 'Letters';
  likes: number;
}

const initialMemories: Memory[] = [
  {
    id: '1',
    title: 'Watching Sunset together over FaceTime',
    date: 'Oct 18, 2026',
    location: 'NY & London',
    imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
    tag: 'Video Calls',
    likes: 12,
  },
  {
    id: '2',
    title: 'Weekend getaway in Central Park',
    date: 'Sep 14, 2026',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=600&q=80',
    tag: 'Trips',
    likes: 24,
  },
  {
    id: '3',
    title: 'Handwritten birthday letter arrived!',
    date: 'Aug 22, 2026',
    location: 'London, UK',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    tag: 'Letters',
    likes: 19,
  },
];

export const MemoriesGallery: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');

  const handleLike = (id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMem: Memory = {
      id: String(Date.now()),
      title: newTitle,
      date: 'Today',
      location: newLocation || 'Everywhere with you',
      imageUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
      tag: 'Trips',
      likes: 1,
    };

    setMemories([newMem, ...memories]);
    setNewTitle('');
    setNewLocation('');
    setShowAddModal(false);
  };

  const filteredMemories =
    activeFilter === 'All'
      ? memories
      : memories.filter((m) => m.tag === activeFilter);

  return (
    <section className="glass-panel memories-section">
      <div className="section-header-row">
        <div>
          <div className="badge badge-rose">
            <Camera size={14} />
            <span>Shared Scrapbook</span>
          </div>
          <h3 className="section-title">Our Moments Across the Miles</h3>
        </div>

        <button
          type="button"
          className="btn-secondary add-memory-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Add Moment</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips">
        {['All', 'Trips', 'Video Calls', 'Letters'].map((filter) => (
          <button
            type="button"
            key={filter}
            className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Gallery Cards Grid */}
      <div className="memories-grid">
        {filteredMemories.map((item) => (
          <div key={item.id} className="memory-card">
            <div className="memory-image-box">
              <img src={item.imageUrl} alt={item.title} className="memory-img" />
              <span className="memory-tag-badge">{item.tag}</span>
              <button
                type="button"
                className="memory-like-btn"
                onClick={() => handleLike(item.id)}
                title="Like memory"
              >
                <Heart size={14} color="#FF4D6D" fill="#FF4D6D" />
                <span>{item.likes}</span>
              </button>
            </div>
            <div className="memory-details">
              <h4 className="memory-card-title">{item.title}</h4>
              <div className="memory-meta-row">
                <span className="memory-meta">
                  <Calendar size={12} />
                  {item.date}
                </span>
                <span className="memory-meta">
                  <MapPin size={12} />
                  {item.location}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Record a Shared Memory</h3>
            <form onSubmit={handleAddMemory} className="modal-form">
              <div className="form-group">
                <label className="form-label">Memory Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 3-hour midnight call about our dream house"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location / Context</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. London & New York"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save to Scrapbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
