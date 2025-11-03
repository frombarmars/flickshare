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
    if (!newComment.trim()) return;

    setIsPosting(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, content: newComment }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const today = new Date();
    const diff = today.getTime() - date.getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (diff < oneDay) return 'Today';
    if (diff < oneDay * 2) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="!p-4">
        <div className="!w-6 !h-6 !border-2 !border-gray-200 !border-t-gray-400 !rounded-full !animate-spin !mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="!divide-y !divide-gray-100">
      {session && (
        <div className="!px-4 !py-3 !bg-white">
          <div className="!flex !gap-2.5">
            <Image
              src={session.user?.image || '/placeholder.jpeg'}
              alt="You"
              width={32}
              height={32}
              className="!rounded-full !object-cover !w-8 !h-8 !mt-1"
            />
            <div className="!flex-1 !relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="!w-full !pr-11 !p-2.5 !text-sm !border !border-gray-200 !rounded-lg 
                           !bg-white focus:!outline-none focus:!border-gray-900 
                           !transition-all"
                disabled={isPosting}
              />
              <button
                onClick={handlePostComment}
                disabled={isPosting || !newComment.trim()}
                className="!absolute !right-2 !top-1/2 !-translate-y-1/2 !p-1.5 !text-blue-500  
                           !rounded-md !transition-all hover:!bg-blue-50
                           disabled:!opacity-40 disabled:!cursor-not-allowed disabled:hover:!bg-transparent
                           !flex !items-center !justify-center"
              >
                <svg className="!w-5 !h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="!flex !flex-col !items-center !justify-center !py-12 !px-4">
          <div className="!w-10 !h-10 !bg-gray-100 !rounded-full !flex !items-center !justify-center !mb-2">
            <svg className="!w-5 !h-5 !text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="!text-sm !text-gray-500">No comments yet</p>
        </div>
      ) : (
        <div className="!divide-y !divide-gray-100">
          {comments.map((comment) => (
            <div key={comment.id} className="!px-4 !py-3 hover:!bg-gray-50/50 !transition-colors">
              <div className="!flex !items-start !gap-2.5">
                <Image
                  src={comment.author.profilePicture || '/placeholder.jpeg'}
                  alt={comment.author.username}
                  width={32}
                  height={32}
                  className="!rounded-full !object-cover !w-8 !h-8"
                />
                <div className="!flex-1 !min-w-0">
                  <div className="!flex !items-baseline !gap-2 !mb-1">
                    <p className="!text-sm !font-medium !text-gray-900">
                      {comment.author.username}
                    </p>
                    <p className="!text-[10px] !text-gray-400">{formatDate(comment.createdAt)}</p>
                  </div>
                  <p className="!text-sm !text-gray-700 !leading-relaxed">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};