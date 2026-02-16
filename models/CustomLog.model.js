import mongoose from 'mongoose';

const logEntrySchema = new mongoose.Schema({
  logTitle: { type: String, default: '' },
  logimage: { type: String, default: '' } // path/URL of uploaded image
}, { _id: true }); // each entry has its own _id for update/delete by entry

const customLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // one CustomLog document per user
  },
  log: [logEntrySchema]
}, {
  timestamps: true
});

customLogSchema.index({ user: 1 });

export default mongoose.model('CustomLog', customLogSchema);
