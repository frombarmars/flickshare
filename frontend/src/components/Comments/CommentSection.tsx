import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    profilePicture?: string;
  };
  replies: Comment[];
}

interface CommentSectionProps {
  reviewId: string;
}

export const CommentSection = ({ reviewId }: CommentSectionProps) => {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comments?reviewId=${reviewId}`);
        if (!res.ok) throw new Error('Failed to fetch comments');
        const data = await res.json();
        setComments(data.comments || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) fetchComments();
  }, [reviewId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      alert('Please enter a comment.');
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, content: newComment }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }

      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsPosting(false);
    }
  };

  // 🕒 Simple date display
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const diff = today.getTime() - date.getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (diff < oneDay) return 'Today';
    if (diff < oneDay * 2) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="!p-4 !bg-white !border-t !border-gray-100">
      <h3 className="!text-base !font-semibold !text-gray-900 !mb-3">Comments</h3>

      {loading && <p className="!text-gray-400 !text-sm">Loading comments...</p>}

      {!loading && comments.length === 0 && (
        <p className="!text-gray-400 !text-sm !italic">No comments yet. Be the first to share your thoughts!</p>
      )}

      <div className="!space-y-3 !mt-2">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="!flex !items-start !space-x-3 !bg-gray-50 !p-3 !rounded-xl !border !border-gray-100 hover:!bg-gray-100 !transition-colors"
          >
            <Image
              src={comment.author.profilePicture || '/placeholder.jpeg'}
              alt={comment.author.username}
              width={36}
              height={36}
              className="!rounded-full !object-cover !w-9 !h-9"
            />
            <div className="!flex-1">
              <p className="!text-sm !font-medium !text-gray-900">
                {comment.author.username}
              </p>
              <p className="!text-sm !text-gray-700 !mt-0.5">{comment.content}</p>
              <p className="!text-xs !text-gray-400 !mt-1">{formatDate(comment.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {session && (
        <div className="!mt-5 !border-t !pt-4 !border-gray-100">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="!w-full !h-20 !p-2.5 !text-base !border !border-gray-200 !rounded-lg 
                       !bg-gray-50 focus:!outline-none focus:!ring-2 focus:!ring-blue-500 
                       !transition-all !duration-150 !disabled:!bg-gray-100 !disabled:!text-gray-400"
            disabled={isPosting}
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handlePostComment}
            disabled={isPosting}
            className="!mt-2 !px-4 !py-2 !text-sm !font-medium !bg-blue-500 !text-white 
                       !rounded-lg !hover:bg-blue-600 !transition-all !duration-150 
                       !disabled:!bg-gray-400 !disabled:!cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post Comment'}
          </button>

          {error && <p className="!text-red-500 !text-sm !mt-2">{error}</p>}
        </div>
      )}

      {!session && (
        <p className="!mt-4 !text-sm !text-gray-500">
          Please sign in to post a comment.
        </p>
      )}
    </div>
  );
};