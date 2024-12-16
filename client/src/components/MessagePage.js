import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import Avatar from './Avatar';
import { HiDotsVertical } from 'react-icons/hi';
import { FaAngleLeft, FaPlus, FaImage, FaVideo } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import Loading from './Loading';
import backgroundImage from '../assets/wallpaper.jpg';
import { IoMdSend } from 'react-icons/io';
import { MdHealthAndSafety, MdOutlineHealthAndSafety } from 'react-icons/md';
import moment from 'moment';
import LOKI97 from '../crypto/LOKI97';
import MacGuffin from '../crypto/MacGuffin';
import uploadFile from '../helpers/uploadFile';

const MessagePage = () => {
  const params = useParams();
  const socketConnection = useSelector((state) => state?.user?.socketConnection);
  const user = useSelector((state) => state?.user);
  const [dataUser, setDataUser] = useState({
    email: '',
    profile_pic: '',
    online: false,
    _id: '',
  });
  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [message, setMessage] = useState({
    text: '',
    imageUrl: '',
    videoUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [allMessage, setAllMessage] = useState([]);
  const currentMessage = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState(LOKI97);
  const [sharedSecret] = useState('your-shared-secret-key'); 

  const padKey = (key) => {
    const keyLength = key.length;
    if (keyLength === 16 || keyLength === 24 || keyLength === 32) {
      return key;
    }
    return key.padEnd(32, '0');
  };
  
  const encryptMessage = (message) => {
    const paddedKey = padKey(sharedSecret);
    return encryptionAlgorithm.encrypt(message, paddedKey);
  };
  
  const decryptMessage = (encryptedMessage) => {
    const paddedKey = padKey(sharedSecret);
    return encryptionAlgorithm.decrypt(encryptedMessage, paddedKey);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (message.text || message.imageUrl || message.videoUrl) {
      const encryptedText = encryptMessage(message.text);

      if (socketConnection) {
        socketConnection.emit('new message', {
          sender: user?._id,
          receiver: params.userId,
          text: encryptedText,
          imageUrl: message.imageUrl,
          videoUrl: message.videoUrl,
          msgByUserId: user?._id,
        });
        setMessage({
          text: '',
          imageUrl: '',
          videoUrl: '',
        });
      }
    }
  };

  useEffect(() => {
    if (socketConnection) {
      socketConnection.on('message', (data) => {
        const decryptedData = data.map((msg) => ({
          ...msg,
          text: msg.text ? decryptMessage(msg.text) : '',
        }));
        setAllMessage(decryptedData);
      });
    }
  }, [socketConnection, params?.userId, user, decryptMessage]);

  const toggleModal = () => {
    setIsModalOpen((prev) => !prev);
  };

  const handleAlgorithmSelect = (algorithm) => {
    if (algorithm === 'LOKI97') {
      setEncryptionAlgorithm(LOKI97);
    } else if (algorithm === 'MacGuffin') {
      setEncryptionAlgorithm(MacGuffin);
    }
    setIsModalOpen(false);
  };

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload((prev) => !prev);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];

    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);

    setMessage((prev) => {
      return {
        ...prev,
        imageUrl: uploadPhoto.url,
      };
    });
  };

  const handleClearUploadImage = () => {
    setMessage((prev) => {
      return {
        ...prev,
        imageUrl: '',
      };
    });
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];

    setLoading(true);
    const uploadPhoto = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);

    setMessage((prev) => {
      return {
        ...prev,
        videoUrl: uploadPhoto.url,
      };
    });
  };

  const handleClearUploadVideo = () => {
    setMessage((prev) => {
      return {
        ...prev,
        videoUrl: '',
      };
    });
  };

  useEffect(() => {
    if (socketConnection) {
      socketConnection.emit('message-page', params.userId);

      socketConnection.emit('seen', params.userId);

      socketConnection.on('message-user', (data) => {
        setDataUser(data);
      });

      socketConnection.on('message', (data) => {
        console.log('message data', data);
        setAllMessage(data);
      });
    }
  }, [socketConnection, params?.userId, user]);

  const handleOnChange = (e) => {
    const { name, value } = e.target;

    setMessage((prev) => {
      return {
        ...prev,
        text: value,
      };
    });
  };

  return (
    <div style={{ backgroundImage: `url(${backgroundImage})` }} className='bg-no-repeat bg-cover'>
      <header className='sticky top-0 h-16 bg-pink-300 flex justify-between items-center px-4'>
        <div className='flex items-center gap-4'>
          <Link to='/' className='lg:hidden'>
            <FaAngleLeft size={25} />
          </Link>
          <div>
            <Avatar width={50} height={50} imageUrl={dataUser?.profile_pic} name={dataUser?.name} userId={dataUser?._id} />
          </div>
          <div>
            <h3 className='font-semibold text-lg my-0 text-ellipsis line-clamp-1'>{dataUser?.name}</h3>
            <p className='-my-2 text-sm'>
              {dataUser.online ? <span className='text-secondary'>online</span> : <span className='text-pink-500'>offline</span>}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='text-sm font-semibold text-secondary'>
            {encryptionAlgorithm === LOKI97 ? 'LOKI97' : 'MacGuffin'}
          </div>
          <button onClick={toggleModal} className='cursor-pointer hover:bg-primary p-2 rounded-2xl text-white'>
            <HiDotsVertical size={20} />
          </button>
        </div>
      </header>

      {/***show all message */}
      <section className='h-[calc(100vh-128px)] overflow-x-hidden overflow-y-scroll scrollbar relative bg-pink-200 bg-opacity-10'>
        {/**choose chipher window */}
        {isModalOpen && (
          <div className='fixed inset-0 flex items-center justify-center bg-white bg-opacity-50'>
            <div className='p-3 bg-white rounded-lg shadow-lg w-40'>
              <form>
                <button className='text-sm p-1 hover:text-red-600' onClick={toggleModal}>
                  <IoClose />
                </button>
                <button
                  className='flex items-center p-2 gap-3 hover:bg-pink-200 rounded-2xl'
                  onClick={(e) => {
                    e.preventDefault();
                    handleAlgorithmSelect('LOKI97');
                  }}
                >
                  <div>
                    <MdHealthAndSafety size={20} />
                  </div>
                  <p>LOKI97</p>
                </button>
                <button
                  className='flex items-center p-2 gap-3 hover:bg-pink-200 rounded-2xl'
                  onClick={(e) => {
                    e.preventDefault();
                    handleAlgorithmSelect('MacGuffin');
                  }}
                >
                  <div>
                    <MdOutlineHealthAndSafety size={20} />
                  </div>
                  <p>MacGuffin</p>
                </button>
              </form>
            </div>
          </div>
        )}

        {/**all message show here */}
        <div className='flex flex-col gap-2 py-2 mx-2' ref={currentMessage}>
          {allMessage.map((msg, index) => {
            return (
              <div
                className={`p-1 py-1 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${
                  user._id === msg?.msgByUserId ? 'ml-auto bg-yellow-200' : 'bg-blue-100'
                }`}
                key={index}
              >
                <div className='w-full relative'>
                  {msg?.imageUrl && <img src={msg?.imageUrl} className='w-full h-full object-scale-down' alt='' />}
                  {msg?.videoUrl && <video src={msg.videoUrl} className='w-full h-full object-scale-down' controls />}
                </div>
                <p className='px-2'>{msg.text}</p>
                <p className='text-xs ml-auto w-fit text-secondary'>{moment(msg.createdAt).format('hh:mm')}</p>
              </div>
            );
          })}
        </div>

        {/**upload Image display */}
        {message.imageUrl && (
          <div className='w-full h-full sticky bottom-0 bg-pink-600 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
            <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadImage}>
              <IoClose size={30} />
            </div>
            <div className='bg-white p-3'>
              <img src={message.imageUrl} alt='' className='aspect-square w-full h-full max-w-sm m-2 object-scale-down' />
            </div>
          </div>
        )}

        {/**upload video display */}
        {message.videoUrl && (
          <div className='w-full h-full sticky bottom-0 bg-pink-600 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
            <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadVideo}>
              <IoClose size={30} />
            </div>
            <div className='bg-white p-3'>
              <video src={message.videoUrl} className='aspect-square w-full h-full max-w-sm m-2 object-scale-down' controls muted autoPlay />
            </div>
          </div>
        )}

        {loading && (
          <div className='w-full h-full flex sticky bottom-0 justify-center items-center'>
            <Loading />
          </div>
        )}
      </section>

      {/**send message */}
      <section className='h-16 bg-white flex items-center px-4'>
        <div className='relative'>
          <button
            onClick={handleUploadImageVideoOpen}
            className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white'
          >
            <FaPlus size={20} />
          </button>

          {/**video and image */}
          {openImageVideoUpload && (
            <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
              <form>
                <label htmlFor='uploadImage' className='flex items-center p-2 px-3 gap-3 hover:bg-pink-200 cursor-pointer'>
                  <div className='text-primary'>
                    <FaImage size={18} />
                  </div>
                  <p>Image</p>
                </label>
                <label htmlFor='uploadVideo' className='flex items-center p-2 px-3 gap-3 hover:bg-pink-200 cursor-pointer'>
                  <div className='text-purple-500'>
                    <FaVideo size={18} />
                  </div>
                  <p>Video</p>
                </label>

                <input type='file' id='uploadImage' onChange={handleUploadImage} className='hidden' />

                <input type='file' id='uploadVideo' onChange={handleUploadVideo} className='hidden' />
              </form>
            </div>
          )}
        </div>

        {/**input box */}
        <form className='h-full w-full flex gap-2' onSubmit={handleSendMessage}>
          <input
            type='text'
            placeholder='Type here message...'
            className='py-1 px-4 outline-none w-full h-full'
            value={message.text}
            onChange={handleOnChange}
          />
          <button className='text-primary hover:text-secondary'>
            <IoMdSend size={28} />
          </button>
        </form>
      </section>
    </div>
  );
};

export default MessagePage;