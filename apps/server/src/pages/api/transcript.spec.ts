import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from './transcript';
import { getSubtitles } from 'youtube-caption-extractor';
import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import { NextApiRequest, NextApiResponse } from 'next';

// Mock dependencies
vi.mock('youtube-caption-extractor');
vi.mock('ytdl-core');
vi.mock('fs-extra');

describe('Transcript API Handler', () => {
    let mockReq: Partial<NextApiRequest>;
    let mockRes: Partial<NextApiResponse>;
    let statusMock: ReturnType<typeof vi.fn>;
    let jsonMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        jsonMock = vi.fn().mockImplementation((data) => data);
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockRes = {
            status: statusMock,
        } as unknown as NextApiResponse;
    });

    it('should return 405 if method is not POST', async () => {
        mockReq = { method: 'GET' };

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(405);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Method not allowed' });
    });

    it('should return 400 if URL is missing', async () => {
        mockReq = {
            method: 'POST',
            body: {}
        };

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'URL is required' });
    });

    it('should successfully save transcript and return 200', async () => {
        const mockUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const mockTitle = 'Never Gonna Give You Up';
        const mockVideoId = 'dQw4w9WgXcQ';
        const mockTranscript = [{ text: 'Never gonna give you up', start: '0', dur: '2' }];

        mockReq = {
            method: 'POST',
            body: { url: mockUrl }
        };

        vi.mocked(ytdl.getBasicInfo).mockResolvedValue({
            videoDetails: {
                title: mockTitle,
                videoId: mockVideoId
            }
        } as unknown as ytdl.videoInfo);

        vi.mocked(getSubtitles).mockResolvedValue(mockTranscript);
        vi.mocked(fs.ensureDir).mockImplementation(() => Promise.resolve());
        vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(ytdl.getBasicInfo).toHaveBeenCalledWith(mockUrl);
        expect(getSubtitles).toHaveBeenCalledWith({ videoID: mockVideoId, lang: 'en' });
        expect(fs.ensureDir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Transcript saved successfully',
            title: expect.any(String),
            fileName: expect.stringContaining('.txt'),
            transcript: 'Never gonna give you up',
            segments: mockTranscript
        }));
    });

    it('should return 500 if an error occurs', async () => {
        mockReq = {
            method: 'POST',
            body: { url: 'https://youtube.com/invalid' }
        };

        vi.mocked(ytdl.getBasicInfo).mockRejectedValue(new Error('Invalid URL'));

        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error fetching transcript',
            error: 'Invalid URL'
        }));
    });
});
